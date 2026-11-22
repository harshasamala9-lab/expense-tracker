const HOUR_RANGES = [
  { maxHour: 12, greeting: 'Good Morning' },
  { maxHour: 18, greeting: 'Good Afternoon' },
  { maxHour: 22, greeting: 'Good Evening' },
];

function hourOfDay() {
  const date = new Date();
  return date.getHours();
}

export function greetingForTimeOfDay() {
  const hour = hourOfDay();

  if (hour < 5 || hour >= 23) {
    return 'Good Evening';
  }

  for (const { maxHour, greeting } of HOUR_RANGES) {
    if (hour < maxHour) {
      return greeting;
    }
  }

  return 'Good Evening';
}

export function usernameFromEmail(email) {
  const localPart = String(email ?? '')
    .split('@')[0]
    .split(/[^A-Za-z0-9]+/)[0];
  return localPart ? localPart.charAt(0).toUpperCase() + localPart.slice(1) : 'Admin';
}

export function dashboardGreeting(user) {
  const email = user?.email || '';
  const name = user?.name || usernameFromEmail(email);
  return `${greetingForTimeOfDay()}, ${name}`;
}
