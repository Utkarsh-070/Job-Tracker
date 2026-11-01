"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { deleteApplication } from "../actions";
export function DeleteApplicationButton({
  id,
  company = "this company",
}: {
  id: string;
  company?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  function confirm() {
    setError("");
    startTransition(async () => {
      try {
        const result = await deleteApplication(id);
        if (result.success) {
          setOpen(false);
          router.push("/");
          router.refresh();
        } else setError(result.error);
      } catch {
        setError("The connection was interrupted. Please try again.");
      }
    });
  }
  return (
    <>
      <Button
        variant="danger"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        Delete application
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Delete this application?"
        busy={pending}
      >
        <p>
          This will permanently remove your application at{" "}
          <strong>{company}</strong>, including its notes.
        </p>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <Button
            variant="secondary"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Keep application
          </Button>
          <Button variant="danger" onClick={confirm} disabled={pending}>
            {pending ? "Deleting…" : "Delete application"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
