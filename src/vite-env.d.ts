/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LOGIN_PASSWORD?: string
  readonly VITE_SECURE_CHANNELS?: string
  readonly VITE_DIAGRAM_PATH?: string
  readonly VITE_WAKE_SKIPS_BOOT?: string
  readonly VITE_WAKE_KEY?: string
  readonly VITE_RESET_TARGET?: string
  readonly VITE_STAFF_PIN?: string
  readonly VITE_ENABLE_MOUSE_RESET_HOTSPOT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
