"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, useOrganization, useOrganizationList, useClerk, OrganizationProfile, CreateOrganization } from "@clerk/nextjs";
import { api, useQuery } from "~/convex/ConvexClientProvider";
import type { Id } from "~/convex/_generated/dataModel";
import { Button } from "@forprompt/ui/button";
import { Input } from "@forprompt/ui/input";
import { Label } from "@forprompt/ui/label";
import { toast } from "@forprompt/ui/toast";
import { cn } from "@forprompt/ui";
import { ConfirmationDialog } from "@components/ui";
import { UsageDashboard } from "./UsageDashboard";
import { PricingPlans } from "./PricingPlans";

type SettingsTab = "profile" | "workspace" | "billing";

export function AccountSettingsPanel() {
  const router = useRouter();
  const { user } = useUser();
  const { organization: activeOrg } = useOrganization();
  const { userMemberships, isLoaded } = useOrganizationList({
    userMemberships: { infinite: true },
  });
  const clerk = useClerk();

  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showLeaveOrg, setShowLeaveOrg] = useState(false);
  const [showCreateOrg, setShowCreateOrg] = useState(false);

  const organizations = useQuery(api.domains.organizations.queries.getUserOrganizations);
  const convexOrg = organizations?.find((o: any) => o.clerkId === activeOrg?.id);

  const memberManagementInfo = useQuery(
    api.domains.organizations.queries.getMemberManagementInfo,
    convexOrg?._id ? { orgId: convexOrg._id as Id<"organizations"> } : "skip"
  );

  const handleLeaveOrganization = async () => {
    if (!activeOrg) return;
    try {
      const membership = userMemberships.data?.find(m => m.organization.id === activeOrg.id);
      if (!membership) {
        toast({ title: "Error", description: "Membership not found", variant: "destructive" });
        return;
      }
      await membership.destroy();
      toast({ title: "Success", description: "You have left the workspace" });
      await clerk.setActive({ organization: null });
      window.location.reload();
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to leave", variant: "destructive" });
    } finally {
      setShowLeaveOrg(false);
    }
  };

  const handleSwitchOrg = async (orgId: string) => {
    if (!isLoaded) return;
    await clerk.setActive({ organization: orgId });
    window.location.reload();
  };

  const tabs = [
    { id: "profile" as const, label: "Profile", icon: "person" },
    { id: "workspace" as const, label: "Manage workspace", icon: "corporate_fare" },
    { id: "billing" as const, label: "Usage & Billing", icon: "bar_chart" },
  ];

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar */}
      <div className="w-full md:w-48 flex-shrink-0 border-b md:border-b-0 md:border-r border-content-border py-4 md:py-6 px-3">
        {/* Back to app */}
        <button
          onClick={() => router.push("/")}
          className="w-full flex items-center gap-2 px-2 py-1.5 mb-2 md:mb-4 rounded text-sm text-text-secondary hover:text-text-primary hover:bg-sidebar-hover text-left transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back to app
        </button>

        <h2 className="text-sm font-medium text-text-primary mb-2 md:mb-4 px-2">Settings</h2>
        <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "whitespace-nowrap flex items-center gap-2 px-3 md:px-2 py-1.5 rounded text-sm text-left transition-colors",
                activeTab === tab.id
                  ? "bg-sidebar-active text-text-primary"
                  : "text-text-secondary hover:text-text-primary hover:bg-sidebar-hover"
              )}
            >
              <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Workspace switcher (Desktop only or different style for mobile) */}
        <div className="hidden md:block mt-6 pt-4 border-t border-content-border">
          <p className="text-xs text-text-tertiary px-2 mb-2">Workspaces</p>
          <div className="space-y-0.5">
            {isLoaded && userMemberships.data?.map(({ organization: org }) => (
              <button
                key={org.id}
                onClick={() => handleSwitchOrg(org.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1 rounded text-xs text-left transition-colors",
                  activeOrg?.id === org.id
                    ? "bg-sidebar-active text-text-primary"
                    : "text-text-secondary hover:text-text-primary hover:bg-sidebar-hover"
                )}
              >
                <span className="truncate">{org.name}</span>
                {activeOrg?.id === org.id && (
                  <span className="material-symbols-outlined text-[12px] ml-auto">check</span>
                )}
              </button>
            ))}
            <button
              onClick={() => setShowCreateOrg(true)}
              className="w-full flex items-center gap-1 px-2 py-1 rounded text-xs text-text-tertiary hover:text-text-primary hover:bg-sidebar-hover text-left"
            >
              <span className="material-symbols-outlined text-[12px]">add</span>
              New workspace
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={cn(
        "flex-1 py-6 px-4 md:px-8 min-w-0 overflow-y-auto",
        activeTab === "profile" ? "max-w-xl" : "max-w-5xl"
      )}>
        {activeTab === "profile" && (
          <div className="space-y-6">
            <h3 className="text-base font-medium text-text-primary">Profile</h3>

            <div className="flex items-center gap-4">
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt="" className="size-12 rounded-full" />
              ) : (
                <div className="size-12 rounded-full bg-gray-800 flex items-center justify-center">
                  <span className="material-symbols-outlined text-gray-500">person</span>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-text-primary">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-text-secondary">{user?.emailAddresses[0]?.emailAddress}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-text-secondary">First Name</Label>
                <Input value={user?.firstName || ""} disabled className="mt-1 h-8 text-sm bg-transparent border-content-border w-full" />
              </div>
              <div>
                <Label className="text-xs text-text-secondary">Last Name</Label>
                <Input value={user?.lastName || ""} disabled className="mt-1 h-8 text-sm bg-transparent border-content-border w-full" />
              </div>
            </div>

            <div>
              <Label className="text-xs text-text-secondary">Email</Label>
              <Input value={user?.emailAddresses[0]?.emailAddress || ""} disabled className="mt-1 h-8 text-sm bg-transparent border-content-border w-full" />
              <p className="text-[10px] text-text-tertiary mt-1">Managed by authentication provider</p>
            </div>

            <div className="pt-4 border-t border-content-border">
              <button
                onClick={() => setShowDeleteAccount(true)}
                className="text-xs text-red-500 hover:text-red-400"
              >
                Delete account
              </button>
            </div>
          </div>
        )}

        {activeTab === "workspace" && (
          <div className="space-y-6 w-full">
            <h3 className="text-base font-medium text-text-primary">Manage workspace</h3>

            {activeOrg ? (
              <div className="rounded-lg border border-content-border w-full">
                <OrganizationProfile
                  routing="hash"
                  appearance={{
                    elements: {
                      rootBox: "w-full max-w-none m-0",
                      card: "bg-transparent border-0 shadow-none p-0 w-full max-w-none",
                      navbar: "bg-sidebar-bg border-r border-content-border hidden sm:flex",
                      navbarButton: "text-text-secondary hover:bg-sidebar-hover hover:text-text-primary",
                      navbarButtonActive: "bg-sidebar-active text-text-primary",
                      pageScrollBox: "bg-transparent p-0",
                      headerTitle: "text-text-primary text-base font-semibold",
                      headerSubtitle: "text-text-secondary text-sm",
                      formButtonPrimary: "bg-gray-100 hover:bg-white text-gray-900 text-xs h-9 px-4 font-medium transition-colors shadow-sm",
                      formFieldInput: "bg-transparent border-content-border text-text-primary text-sm h-10 rounded-md focus:border-gray-500",
                      formFieldLabel: "text-text-secondary text-xs font-semibold uppercase tracking-wider mb-1.5",
                      tableHead: "text-text-secondary text-[10px] uppercase tracking-widest font-bold border-b border-content-border",
                      tableCell: "text-text-primary text-sm py-4",
                      membersPageInviteButton: "bg-gray-100 hover:bg-white text-gray-900 text-xs h-9 px-4 font-medium",
                      avatarViewContainer: "flex items-center gap-6 mb-8",
                      avatarBox: "size-20 rounded-xl border-2 border-content-border shadow-lg",
                      avatarUploadButton: "text-text-primary hover:text-white text-xs font-medium bg-sidebar-hover px-3 py-1.5 rounded-md transition-all",
                      profileSectionTitleText: "text-text-primary text-lg font-bold tracking-tight",
                      profileSectionSubtitleText: "text-text-secondary text-sm",
                      formButtonReset: "text-text-secondary hover:text-text-primary text-xs",
                      scrollBox: "bg-transparent",
                      modalBackdrop: "bg-black/80 backdrop-blur-sm",
                      modalContent: "bg-sidebar-bg border border-sidebar-border rounded-xl shadow-2xl",
                    },
                  }}
                />
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-text-secondary mb-3">No workspace selected</p>
                <Button size="sm" onClick={() => setShowCreateOrg(true)}>Create workspace</Button>
              </div>
            )}
          </div>
        )}

        {activeTab === "billing" && (
          <div className="space-y-8 w-full max-w-4xl">
            {activeOrg ? (
              <>
                <UsageDashboard />
                <div id="pricing-plans" className="border-t border-content-border pt-8">
                  <PricingPlans />
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-text-secondary mb-3">No workspace selected</p>
                <Button size="sm" onClick={() => setShowCreateOrg(true)}>Create workspace</Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <ConfirmationDialog
        isOpen={showDeleteAccount}
        onClose={() => setShowDeleteAccount(false)}
        onConfirm={() => {
          router.push('/user-profile');
          setShowDeleteAccount(false);
        }}
        title="Delete Account"
        description="You will be redirected to complete account deletion."
        confirmText="Continue"
        variant="destructive"
      />

      <ConfirmationDialog
        isOpen={showLeaveOrg}
        onClose={() => setShowLeaveOrg(false)}
        onConfirm={handleLeaveOrganization}
        title="Leave Workspace"
        description={`Leave "${activeOrg?.name}"? You'll lose access to all resources.`}
        confirmText="Leave"
        variant="destructive"
      />

      {showCreateOrg && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center" onClick={() => setShowCreateOrg(false)}>
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowCreateOrg(false)} className="absolute -top-2 -right-2 p-1.5 bg-gray-800 hover:bg-gray-700 rounded-full z-10">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
            <div className="bg-sidebar-bg rounded-lg border border-sidebar-border">
              <CreateOrganization
                appearance={{
                  elements: {
                    card: "bg-sidebar-bg border-0 shadow-none p-6",
                    headerTitle: "text-text-primary text-lg",
                    headerSubtitle: "text-text-secondary text-sm",
                    formButtonPrimary: "bg-gray-100 hover:bg-white text-gray-900",
                    formFieldInput: "bg-transparent border-content-border text-text-primary",
                    formFieldLabel: "text-text-secondary text-sm",
                    footer: "hidden",
                  },
                }}
                afterCreateOrganizationUrl="/"
                skipInvitationScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
