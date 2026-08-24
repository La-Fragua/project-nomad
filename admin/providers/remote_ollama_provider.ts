import logger from '@adonisjs/core/services/logger'
import type { ApplicationService } from '@adonisjs/core/types'

/**
 * Seeds remote Ollama from NOMAD_REMOTE_OLLAMA_URL (Unraid / external GPU host).
 *
 * When the env var is set, AI Assistant is marked installed without creating
 * `nomad_ollama`. Qdrant is still started so downloaded content is embedded
 * into the knowledge base via the remote Ollama `/api/embed` (or `/v1/embeddings`)
 * endpoints — the same path `configureRemote` uses.
 *
 * When the env var is empty, this provider is a no-op. The wizard and Settings
 * remain the way to attach a remote host. Compose never starts an Ollama service.
 */
export default class RemoteOllamaProvider {
  constructor(protected app: ApplicationService) {}

  async boot() {
    if (this.app.getEnvironment() !== 'web') return

    setImmediate(async () => {
      try {
        const { getRemoteOllamaUrlFromEnv } = await import('../app/utils/remote_ollama.js')
        const url = getRemoteOllamaUrlFromEnv()
        if (!url) return

        const { assertNotCloudMetadataUrl } = await import('#validators/common')
        assertNotCloudMetadataUrl(url)

        const KVStore = (await import('#models/kv_store')).default
        const Service = (await import('#models/service')).default
        const { SERVICE_NAMES } = await import('../constants/service_names.js')
        const { DockerService } = await import('#services/docker_service')
        const { RagService } = await import('#services/rag_service')
        const { OllamaService } = await import('#services/ollama_service')

        await KVStore.setValue('ai.remoteOllamaUrl', url)

        const ollama = await Service.query().where('service_name', SERVICE_NAMES.OLLAMA).first()
        if (ollama) {
          ollama.installed = true
          ollama.installation_status = 'idle'
          await ollama.save()
        }

        const dockerService = new DockerService()
        const qdrant = await Service.query().where('service_name', SERVICE_NAMES.QDRANT).first()
        if (qdrant && !qdrant.installed) {
          logger.info(
            '[RemoteOllamaProvider] Installing Qdrant so knowledge-base embeddings still run against remote Ollama.'
          )
          dockerService.createContainerPreflight(SERVICE_NAMES.QDRANT).catch((error) => {
            logger.error('[RemoteOllamaProvider] Failed to start Qdrant:', error)
          })
        }

        await KVStore.setValue('chat.suggestionsEnabled', false)
        const ragService = new RagService(dockerService, new OllamaService())
        ragService.discoverNomadDocs().catch((error) => {
          logger.error('[RemoteOllamaProvider] Failed to discover Nomad docs:', error)
        })

        logger.info(
          `[RemoteOllamaProvider] Using remote Ollama at ${url}; local nomad_ollama will not be created.`
        )
      } catch (err: any) {
        logger.warn(`[RemoteOllamaProvider] Skipped: ${err?.message ?? err}`)
      }
    })
  }
}
