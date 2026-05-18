export const useUserRole = () => {
  const user = JSON.parse(sessionStorage.getItem("user") ?? "{}");
  return user.role as "Admin" | "Accountant" | undefined;
};
