import ngrok from "@ngrok/ngrok";
import dotenv from "dotenv";
dotenv.config();

export async function startNgrok(port: number) {
  if (process.env.NGROK_ENABLED !== "true") {
    console.log("[ngrok] NGROK_ENABLED is not 'true', skipping ngrok startup.");
    return null;
  }

  // Prepare ngrok options
  const options: any = {
    addr: port,
    authtoken: process.env.NGROK_AUTHTOKEN,
    domain: process.env.NGROK_DOMAIN
  };
 
  // Debug log the options and env
  console.log("[ngrok] Starting ngrok with options:", options);

  const listener = await ngrok.forward(options);
  const url = typeof listener === "string" ? listener : listener.url();
  console.log(`ngrok tunnel started at: ${url}`);

  // Warn if the returned URL does not match the requested domain
  if (
    process.env.NGROK_DOMAIN &&
    typeof url === "string" &&
    url &&
    !(url as string).includes(process.env.NGROK_DOMAIN)
  ) {
    console.warn(
      `[ngrok] WARNING: Requested domain '${process.env.NGROK_DOMAIN}' was not assigned. Actual URL: ${url}`
    );
    console.warn(
      `[ngrok] Possible causes: domain not reserved, already in use, authtoken/account mismatch, region mismatch, or plan limitation.`
    );
  }

  return url;
}
