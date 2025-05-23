
export const config = {
  port: 5000,
  host: "0.0.0.0",
  supabase: {
    url: process.env.SUPABASE_URL || "https://atjmvjmbygrkwxchfxzl.supabase.co",
    key: process.env.SUPABASE_KEY,
    email: process.env.SUPABASE_EMAIL,
    password: process.env.SUPABASE_PASSWORD
  }
};
