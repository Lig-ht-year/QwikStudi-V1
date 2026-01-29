export function logout() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  
  // Call Django logout endpoint to blacklist the token
  const access = localStorage.getItem("access");
  if (access) {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access}`,
      },
    }).finally(() => {
      window.location.href = "/auth/login";
    });
  } else {
    window.location.href = "/auth/login";
  }
}
