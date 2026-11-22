function IconBase({ children, size = 20, className = '', ...rest }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      focusable="false"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function IconDashboard(props) {
  return (
    <IconBase {...props}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </IconBase>
  );
}

export function IconReceipt(props) {
  return (
    <IconBase {...props}>
      <path d="M5 3v18l2.5-1.5L10 21l2-1.5L14 21l2.5-1.5L19 21V3l-2.5 1.5L14 3l-2 1.5L10 3 7.5 4.5 5 3Z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </IconBase>
  );
}

export function IconChartPie(props) {
  return (
    <IconBase {...props}>
      <path d="M21 12a9 9 0 1 1-9-9v9h9Z" />
      <path d="M12 3a9 9 0 0 1 9 9" />
    </IconBase>
  );
}

export function IconPlus(props) {
  return (
    <IconBase {...props}>
      <path d="M12 5v14M5 12h14" />
    </IconBase>
  );
}

export function IconPencil(props) {
  return (
    <IconBase {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
    </IconBase>
  );
}

export function IconTrash(props) {
  return (
    <IconBase {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v5M14 11v5" />
    </IconBase>
  );
}

export function IconWallet(props) {
  return (
    <IconBase {...props}>
      <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v3" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
      <path d="M16 12h5v4h-5a2 2 0 0 1 0-4Z" />
    </IconBase>
  );
}

export function IconMenu(props) {
  return (
    <IconBase {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </IconBase>
  );
}

export function IconX(props) {
  return (
    <IconBase {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </IconBase>
  );
}

export function IconCheckCircle(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </IconBase>
  );
}

export function IconAlertCircle(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16h.01" />
    </IconBase>
  );
}

export function IconInfo(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </IconBase>
  );
}

export function IconRefresh(props) {
  return (
    <IconBase {...props}>
      <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" />
      <path d="M3 21v-5h5" />
      <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" />
      <path d="M21 3v5h-5" />
    </IconBase>
  );
}

export function IconArrowRight(props) {
  return (
    <IconBase {...props}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </IconBase>
  );
}

export function IconArrowUpRight(props) {
  return (
    <IconBase {...props}>
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </IconBase>
  );
}

export function IconTrendingUp(props) {
  return (
    <IconBase {...props}>
      <path d="m3 17 6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </IconBase>
  );
}

export function IconCalendar(props) {
  return (
    <IconBase {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18" />
    </IconBase>
  );
}

export function IconLock(props) {
  return (
    <IconBase {...props}>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </IconBase>
  );
}

export function IconGoogle(props) {
  return (
    <IconBase {...props} size={16}>
      <path d="M16.5 14.6a8.5 8.5 0 0 1-6.8 4.7c-2.6 0-5-1-6.8-2.7l-2.3 1.8A10 10 0 0 0 12 22c4.1 0 7.8-1.6 10.6-4.2l-3.2-3.2Z" />
      <path d="M5.4 12.1a9 9 0 0 1 6.6-9.4c-2.1-1.3-4.4-2-6.6-2-6 0-11 4.2-11 10a7.5 7.5 0 0 0 .2 1.7l2.4-1.9Z" />
      <path d="M19.8 11.6a10 10 0 0 0-1-1.7L19.2 10l2.3 2.3c.3-1 .3-2 .2-3Z" />
    </IconBase>
  );
}

export function IconBell(props) {
  return (
    <IconBase {...props}>
      <path d="M6.3 6.3a6 6 0 1 1 12 12" />
      <path d="M8.5 4.3a8.5 8.5 0 0 1 15 0" />
      <path d="M15 18.3a2 2 0 1 1-4 0H15Z" />
      <path d="M17.5 19.5A8 8 0 0 1 9.5 19" />
    </IconBase>
  );
}

export function IconTasks(props) {
  return (
    <IconBase {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 9h8" />
      <path d="M8 13h5" />
      <path d="M17 14l-4 4-3-3" />
    </IconBase>
  );
}

export function IconClock(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7v4.5l3 2" />
    </IconBase>
  );
}

export function IconPin(props) {
  return (
    <IconBase {...props}>
      <path d="M20 13V6.5A3.5 3.5 0 0 0 13.5 3h-4A3.5 3.5 0 0 0 6 6.5V13" />
      <path d="M7 20.5A6.5 6.5 0 0 0 20.5 7h-2A4.5 4.5 0 0 0 16 10.5V13a4 4 0 1 1-8 0V10.5A4.5 4.5 0 0 0 6.5 6h-2A6.5 6.5 0 0 0 7 20.5Z" />
    </IconBase>
  );
}

export function IconLogout(props) {
  return (
    <IconBase {...props}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
      <path d="M16 17h5v-1a5 5 0 0 0-5-5h-1" />
      <path d="m21 3-7 7" />
      <path d="M13 10l-7 7h2l4-4" />
    </IconBase>
  );
}

export function IconLogo({ size = 22, className = '', ...rest }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      focusable="false"
      aria-hidden="true"
      {...rest}
    >
      <rect
        x="3"
        y="6"
        width="18"
        height="13"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M3 10h18"
        stroke="currentColor"
        strokeWidth="1.8"
        opacity=".55"
      />
      <circle cx="17" cy="14.5" r="1.25" fill="currentColor" />
    </svg>
  );
}
