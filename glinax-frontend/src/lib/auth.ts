export function logout() {
  // Capture token before clearing storage
  const access = localStorage.getItem("access");
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");

  // Call Django logout endpoint (best effort)
  if (access) {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access}`,
      },
    }).finally(() => {
      window.location.href = "/login";
    });
  } else {
    window.location.href = "/login";
  }
}
