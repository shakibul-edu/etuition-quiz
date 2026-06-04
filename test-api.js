import fetch from "node-fetch";

async function test() {
  try {
    console.log("sending request...");
    const res = await fetch("http://localhost:3000/api/questions/generate", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ className: "SSC", subject: "bangla-1", limit: 5 })
    });
    console.log("status:", res.status);
    const text = await res.text();
    console.log("response:", text);
  } catch (e) {
    console.error(e);
  }
}
test();
