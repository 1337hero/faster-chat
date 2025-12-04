import { useState } from "preact/hooks";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense } from "preact/compat";
import { adminClient } from "@/lib/adminClient";
import { Button } from "@/components/ui/button";

// Lazy load modal components - only load when needed
const CreateUserModal = lazy(() => import("./CreateUserModal"));
const EditUserRoleModal = lazy(() => import("./EditUserRoleModal"));
const ResetPasswordModal = lazy(() => import("./ResetPasswordModal"));
const DeleteUserModal = lazy(() => import("./DeleteUserModal"));

const UsersTab = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editRoleUser, setEditRoleUser] = useState(null);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);

  const queryClient = useQueryClient();

  // Fetch users
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => adminClient.getUsers(),
  });

  const users = data?.users || [];

  // Filter users based on search
  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "a few seconds ago";
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? "minute" : "minutes"} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatDate(dateString);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-theme-text-muted">Loading users...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-theme-red">Error loading users: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header with search and add button */}
      <div className="border-theme-surface flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <h2 className="text-theme-text text-lg font-semibold">
            Users <span className="text-theme-text-muted">{users.length}</span>
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onInput={(e) => setSearchQuery(e.target.value)}
              className="border-theme-surface-strong bg-theme-canvas text-theme-text placeholder-theme-text-muted focus:border-theme-blue w-64 rounded-lg border px-4 py-2 text-sm focus:outline-none"
            />
            <svg
              className="text-theme-text-muted absolute top-2.5 right-3 h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <Button
            onClick={() => setCreateModalOpen(true)}
            color="blue"
            className="flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add User
          </Button>
        </div>
      </div>

      {/* Users table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <table className="w-full">
          <thead>
            <tr className="border-theme-surface border-b">
              <th className="text-theme-text-muted pb-3 text-left text-xs font-semibold tracking-wider uppercase">
                Role
              </th>
              <th className="text-theme-text-muted pb-3 text-left text-xs font-semibold tracking-wider uppercase">
                Name
              </th>
              <th className="text-theme-text-muted pb-3 text-left text-xs font-semibold tracking-wider uppercase">
                Email
              </th>
              <th className="text-theme-text-muted pb-3 text-left text-xs font-semibold tracking-wider uppercase">
                Last Active
              </th>
              <th className="text-theme-text-muted pb-3 text-left text-xs font-semibold tracking-wider uppercase">
                Created At
              </th>
              <th className="text-theme-text-muted pb-3 text-right text-xs font-semibold tracking-wider uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="border-theme-surface hover:bg-theme-canvas-alt border-b">
                <td className="py-4">
                  <span
                    className={`inline-flex rounded-md px-2 py-1 text-xs font-medium uppercase ${
                      user.role === "admin"
                        ? "bg-theme-blue/10 text-theme-blue"
                        : "bg-theme-green/10 text-theme-green"
                    }`}>
                    {user.role}
                  </span>
                </td>
                <td className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-theme-yellow text-theme-canvas flex h-10 w-10 items-center justify-center rounded-full">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-theme-text font-medium">{user.username}</span>
                  </div>
                </td>
                <td className="text-theme-text-muted py-4">
                  {user.email || `${user.username}@mk3y.com`}
                </td>
                <td className="text-theme-text-muted py-4">
                  {formatRelativeTime(user.last_active)}
                </td>
                <td className="text-theme-text-muted py-4">{formatDate(user.created_at)}</td>
                <td className="py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setEditRoleUser(user)}
                      className="text-theme-text-muted hover:bg-theme-surface hover:text-theme-text rounded-lg p-2"
                      title="Change role">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => setResetPasswordUser(user)}
                      className="text-theme-text-muted hover:bg-theme-surface hover:text-theme-text rounded-lg p-2"
                      title="Reset password">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteUser(user)}
                      className="text-theme-red hover:bg-theme-surface rounded-lg p-2"
                      title="Delete user">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="text-theme-text-muted py-12 text-center">No users found</div>
        )}
      </div>

      {/* Modals - wrapped in Suspense for lazy loading */}
      <Suspense fallback={null}>
        {createModalOpen && (
          <CreateUserModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} />
        )}
        {editRoleUser && (
          <EditUserRoleModal
            user={editRoleUser}
            isOpen={!!editRoleUser}
            onClose={() => setEditRoleUser(null)}
          />
        )}
        {resetPasswordUser && (
          <ResetPasswordModal
            user={resetPasswordUser}
            isOpen={!!resetPasswordUser}
            onClose={() => setResetPasswordUser(null)}
          />
        )}
        {deleteUser && (
          <DeleteUserModal
            user={deleteUser}
            isOpen={!!deleteUser}
            onClose={() => setDeleteUser(null)}
          />
        )}
      </Suspense>
    </div>
  );
};

export default UsersTab;
