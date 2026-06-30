const FormError = ({ error }) =>
  error ? (
    <div className="bg-theme-red/10 text-theme-red rounded-lg px-4 py-3 text-sm">{error}</div>
  ) : null;

export default FormError;
