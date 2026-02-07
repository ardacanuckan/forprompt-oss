"use client";

import { Select } from "@forprompt/ui/select";

interface MemberRoleSelectorProps {
  currentRole: string;
  onChange: (newRole: string) => void;
  disabled?: boolean;
}

export function MemberRoleSelector({ currentRole, onChange, disabled }: MemberRoleSelectorProps) {
  return (
    <select
      value={currentRole}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="px-3 py-1.5 text-xs font-medium bg-gray-800 text-gray-300 rounded border border-gray-700 hover:border-gray-600 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <option value="org:admin">Admin</option>
      <option value="org:member">Member</option>
    </select>
  );
}

