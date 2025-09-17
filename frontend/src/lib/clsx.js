export function clsx(...classes) {
  function toVal(mix) {
    if (typeof mix === 'string' || typeof mix === 'number') {
      return mix.toString();
    }

    if (!mix) return '';

    if (Array.isArray(mix)) {
      return mix.map(toVal).filter(Boolean).join(' ');
    }

    if (typeof mix === 'object') {
      return Object.entries(mix)
        .filter(([_, value]) => value)
        .map(([key]) => key)
        .join(' ');
    }

    return '';
  }

  return classes.map(toVal).filter(Boolean).join(' ');
}
