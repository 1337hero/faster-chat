const RoleSelect = ({ id, value, onChange }) => (
  <select
    id={id}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="border-theme-surface-strong bg-theme-canvas text-theme-text focus:border-theme-blue mt-1 w-full rounded-lg border px-4 py-2 focus:outline-none">
    <option value="member">Member</option>
    <option value="admin">Admin</option>
    <option value="readonly">Read Only</option>
  </select>
);

export default RoleSelect;
