export const formatCurrency = (amount: number): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return "0 FCFA";
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " FCFA";
};

export const formatRelativeDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24));

  const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  const timeStr = date.toLocaleTimeString('fr-FR', timeOptions);

  if (diffInDays === 0) return `Aujourd'hui à ${timeStr}`;
  if (diffInDays === 1) return `Hier à ${timeStr}`;
  
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

export const formatFullDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

export const getInitials = (firstName: string, lastName: string): string => {
  const f = firstName.charAt(0).toUpperCase();
  const l = lastName.charAt(0).toUpperCase();
  return `${f}${l}`;
};