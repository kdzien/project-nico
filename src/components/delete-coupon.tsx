"use client";
import { useActionState, useState } from "react";
import { deleteCoupon } from "@/app/coupons/actions";
export function DeleteCoupon({ id }: { id: string }) {
  const [state, action, pending] = useActionState(deleteCoupon, "");
  const [confirming, setConfirming] = useState(false);
  return <div>{confirming ? <form action={action} className="delete-form"><input type="hidden" name="id" value={id} />
    <span>Usunąć ten kupon?</span><button className="secondary" disabled={pending}>Tak, usuń</button><button type="button" className="text-button" onClick={() => setConfirming(false)}>Anuluj</button>
  </form> : <button type="button" className="text-button" onClick={() => setConfirming(true)}>Usuń kupon</button>}{state && <p role="status">{state}</p>}</div>;
}
