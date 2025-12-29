import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAnglesRight, faCheckDouble, faRotate } from '@fortawesome/free-solid-svg-icons';

interface IconProps {
  className?: string;
}

export function SyncIcon({ className }: IconProps) {
  return <FontAwesomeIcon icon={faRotate} className={className} aria-hidden="true" />;
}

export function SkipIcon({ className }: IconProps) {
  return <FontAwesomeIcon icon={faAnglesRight} className={className} aria-hidden="true" />;
}

export function MarkAllReadIcon({ className }: IconProps) {
  return <FontAwesomeIcon icon={faCheckDouble} className={className} aria-hidden="true" />;
}
