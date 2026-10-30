import { href } from '../router'
import { useStore } from '../store'
import { IconCloud, IconCloudAlert, IconCloudCheck, IconCloudOff, IconSync } from '../icons'

export function SyncIndicator() {
  const sync = useStore((s) => s.sync)
  const configured = useStore((s) => Boolean(s.settings.serverUrl && s.settings.token))
  const pending = useStore((s) => [...s.series.values()].filter((x) => x._dirty).length)

  let icon = <IconCloudOff />
  let text = 'Nur lokal'
  if (configured) {
    if (sync.state === 'syncing') [icon, text] = [<IconSync className="spin" />, 'Synchronisiere …']
    else if (sync.state === 'error') [icon, text] = [<IconCloudAlert />, 'Sync-Fehler']
    else if (pending) [icon, text] = [<IconCloud />, `${pending} ungesichert`]
    else [icon, text] = [<IconCloudCheck />, 'Synchronisiert']
  }

  return (
    <a href={href.sync()} className={`sync-indicator is-${configured ? sync.state : 'local'}`} title={sync.message ?? text}>
      {icon}
      <span>{text}</span>
    </a>
  )
}
