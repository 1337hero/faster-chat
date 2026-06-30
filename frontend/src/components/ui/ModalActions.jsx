import { Button } from "@/components/ui/button";

const ModalActions = ({
  onCancel,
  onSubmit,
  submitType = "submit",
  color = "blue",
  pending,
  label,
  pendingLabel,
}) => (
  <div className="flex justify-end gap-3">
    <Button type="button" plain onClick={onCancel}>
      Cancel
    </Button>
    <Button type={submitType} color={color} onClick={onSubmit} disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  </div>
);

export default ModalActions;
