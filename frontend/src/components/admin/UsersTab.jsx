import { useState } from "preact/hooks";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminClient } from "@/lib/adminClient";
import { Button } from "@/components/ui/button";
import CreateUserModal from "./CreateUserModal";
import EditUserRoleModal from "./EditUserRoleModal";
import ResetPasswordModal from "./ResetPasswordModal";
import DeleteUserModal from "./DeleteUserModal";

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
        <div className="text-latte-subtext0 dark:text-macchiato-subtext0">Loading users...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-latte-red dark:text-macchiato-red">
          Error loading users: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header with search and add button */}
      <div className="flex items-center justify-between border-b border-latte-surface0 px-6 py-4 dark:border-macchiato-surface0">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-latte-text dark:text-macchiato-text">
            Users <span className="text-latte-subtext0 dark:text-macchiato-subtext0">{users.length}</span>
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onInput={(e) => setSearchQuery(e.target.value)}
              className="w-64 rounded-lg border border-latte-surface1 bg-latte-base px-4 py-2 text-sm text-latte-text placeholder-latte-subtext0 focus:border-latte-blue focus:outline-none dark:border-macchiato-surface1 dark:bg-macchiato-mantle dark:text-macchiato-text dark:placeholder-macchiato-subtext0 dark:focus:border-macchiato-blue"
            />
            <svg
              className="absolute right-3 top-2.5 h-5 w-5 text-latte-subtext0 dark:text-macchiato-subtext0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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
            className="flex items-center gap-2"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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
            <tr className="border-b border-latte-surface0 dark:border-macchiato-surface0">
              <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-latte-subtext0 dark:text-macchiato-subtext0">
                Role
              </th>
              <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-latte-subtext0 dark:text-macchiato-subtext0">
                Name
              </th>
              <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-latte-subtext0 dark:text-macchiato-subtext0">
                Email
              </th>
              <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-latte-subtext0 dark:text-macchiato-subtext0">
                Last Active
              </th>
              <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-latte-subtext0 dark:text-macchiato-subtext0">
                Created At
              </th>
              <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wider text-latte-subtext0 dark:text-macchiato-subtext0">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr
                key={user.id}
                className="border-b border-latte-surface0 hover:bg-latte-mantle dark:border-macchiato-surface0 dark:hover:bg-macchiato-mantle"
              >
                <td className="py-4">
                  <span
                    className={`inline-flex rounded-md px-2 py-1 text-xs font-medium uppercase ${
                      user.role === "admin"
                        ? "bg-latte-blue/10 text-latte-blue dark:bg-macchiato-blue/10 dark:text-macchiato-blue"
                        : "bg-latte-green/10 text-latte-green dark:bg-macchiato-green/10 dark:text-macchiato-green"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-latte-yellow text-latte-base dark:bg-macchiato-yellow dark:text-macchiato-base">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-latte-text dark:text-macchiato-text">
                      {user.username}
                    </span>
                  </div>
                </td>
                <td className="py-4 text-latte-subtext0 dark:text-macchiato-subtext0">
                  {user.email || `${user.username}@mk3y.com`}
                </td>
                <td className="py-4 text-latte-subtext0 dark:text-macchiato-subtext0">
                  {formatRelativeTime(user.last_active)}
                </td>
                <td className="py-4 text-latte-subtext0 dark:text-macchiato-subtext0">
                  {formatDate(user.created_at)}
                </td>
                <td className="py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setEditRoleUser(user)}
                      className="rounded-lg p-2 text-latte-subtext0 hover:bg-latte-surface0 hover:text-latte-text dark:text-macchiato-subtext0 dark:hover:bg-macchiato-surface0 dark:hover:text-macchiato-text"
                      title="Change role"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
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
                      className="rounded-lg p-2 text-latte-subtext0 hover:bg-latte-surface0 hover:text-latte-text dark:text-macchiato-subtext0 dark:hover:bg-macchiato-surface0 dark:hover:text-macchiato-text"
                      title="Reset password"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
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
                      className="rounded-lg p-2 text-latte-red hover:bg-latte-surface0 dark:text-macchiato-red dark:hover:bg-macchiato-surface0"
                      title="Delete user"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
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
          <div className="py-12 text-center text-latte-subtext0 dark:text-macchiato-subtext0">
            No users found
          </div>
        )}
      </div>

      {/* Modals */}
      {createModalOpen && (
        <CreateUserModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
        />
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
    </div>
  );
};

export default UsersTab;
