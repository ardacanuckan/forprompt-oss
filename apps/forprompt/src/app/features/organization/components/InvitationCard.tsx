"use client";

import { Button } from "@forprompt/ui/button";

interface InvitationCardProps {
  invitation: {
    _id: string;
    email: string;
    role: string;
    createdAt: number;
    expiresAt?: number;
    invitedBy?: {
      firstName?: string;
      lastName?: string;
      email: string;
    } | null;
  };
  onRevoke?: (invitationId: string) => void;
  onResend?: (invitationId: string) => void;
}

export function InvitationCard({
  invitation,
  onRevoke,
  onResend,
}: InvitationCardProps) {
  const isExpired = invitation.expiresAt && invitation.expiresAt < Date.now();
  const inviterName = invitation.invitedBy?.firstName && invitation.invitedBy?.lastName
    ? `${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}`
    : invitation.invitedBy?.email ?? "Unknown";

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border border-content-border bg-sidebar-hover/50">
      {/* Icon */}
      <div className="size-12 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-outlined text-[24px] text-gray-400">
          {isExpired ? "schedule" : "mail"}
        </span>
      </div>
      
      {/* Invitation Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-text-primary truncate">
            {invitation.email}
          </h4>
          {isExpired && (
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-red-500/20 text-red-400 rounded border border-red-500/30">
              EXPIRED
            </span>
          )}
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-yellow-500/20 text-yellow-400 rounded border border-yellow-500/30">
            PENDING
          </span>
        </div>
        <p className="text-sm text-text-secondary">
          Invited by {inviterName} • {invitation.role === "org:admin" ? "Admin" : "Member"}
        </p>
        <p className="text-xs text-text-tertiary mt-0.5">
          Sent {new Date(invitation.createdAt).toLocaleDateString()}
          {invitation.expiresAt && !isExpired && (
            <> • Expires {new Date(invitation.expiresAt).toLocaleDateString()}</>
          )}
        </p>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-2">
        {onResend && !isExpired && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onResend(invitation._id)}
            className="border-content-border text-text-primary hover:bg-sidebar-hover"
          >
            <span className="material-symbols-outlined text-[16px] mr-1">send</span>
            Resend
          </Button>
        )}
        {onRevoke && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRevoke(invitation._id)}
            className="border-red-900/50 text-red-500 hover:bg-red-900/20 hover:border-red-800"
          >
            <span className="material-symbols-outlined text-[16px] mr-1">cancel</span>
            Revoke
          </Button>
        )}
      </div>
    </div>
  );
}

