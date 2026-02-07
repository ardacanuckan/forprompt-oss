"use client";

import { Button } from "@forprompt/ui/button";
import { MemberRoleSelector } from ".";

interface MemberCardProps {
  member: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email: string;
    imageUrl?: string;
    role: string;
    joinedAt?: number;
    membershipId?: string;
  };
  currentUserId?: string;
  isAdmin: boolean;
  onRoleChange?: (membershipId: string, newRole: string) => void;
  onRemove?: (membershipId: string) => void;
}

export function MemberCard({
  member,
  currentUserId,
  isAdmin,
  onRoleChange,
  onRemove,
}: MemberCardProps) {
  const isCurrentUser = currentUserId === member._id;
  const displayName = member.firstName && member.lastName 
    ? `${member.firstName} ${member.lastName}` 
    : member.email;

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border border-content-border hover:border-gray-600 transition-colors">
      {/* Avatar */}
      {member.imageUrl ? (
        <img 
          src={member.imageUrl} 
          alt={displayName}
          className="size-12 rounded-full object-cover border-2 border-gray-700"
        />
      ) : (
        <div className="size-12 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center">
          <span className="material-symbols-outlined text-[24px] text-gray-400">person</span>
        </div>
      )}
      
      {/* Member Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-text-primary truncate">
            {displayName}
          </h4>
          {isCurrentUser && (
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-500/20 text-blue-400 rounded border border-blue-500/30">
              YOU
            </span>
          )}
        </div>
        <p className="text-sm text-text-secondary truncate">{member.email}</p>
        {member.joinedAt && (
          <p className="text-xs text-text-tertiary mt-0.5">
            Joined {new Date(member.joinedAt).toLocaleDateString()}
          </p>
        )}
      </div>
      
      {/* Role & Actions */}
      <div className="flex items-center gap-3">
        {isAdmin && !isCurrentUser && onRoleChange && member.membershipId ? (
          <MemberRoleSelector
            currentRole={member.role}
            onChange={(newRole) => onRoleChange(member.membershipId!, newRole)}
          />
        ) : (
          <span className="px-3 py-1.5 text-xs font-medium bg-gray-800 text-gray-300 rounded border border-gray-700">
            {member.role === "org:admin" ? "Admin" : "Member"}
          </span>
        )}
        
        {isAdmin && !isCurrentUser && onRemove && member.membershipId && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRemove(member.membershipId!)}
            className="border-red-900/50 text-red-500 hover:bg-red-900/20 hover:border-red-800"
          >
            <span className="material-symbols-outlined text-[16px]">person_remove</span>
          </Button>
        )}
      </div>
    </div>
  );
}

