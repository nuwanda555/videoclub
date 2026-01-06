export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
};

export const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('es-ES');
};

export const calculateDaysLate = (expected: string, actual: string = new Date().toISOString()): number => {
  const exp = new Date(expected).setHours(0, 0, 0, 0);
  const act = new Date(actual).setHours(0, 0, 0, 0);
  const diffTime = act - exp;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

export const calculateReturnDate = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};
