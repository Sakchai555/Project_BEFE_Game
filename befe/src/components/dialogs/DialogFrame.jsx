export default function DialogFrame({
  dialogRef,
  className,
  children,
  onClose,
}) {
  return (
    <dialog
      ref={dialogRef}
      className={className}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {children}
    </dialog>
  );
}
