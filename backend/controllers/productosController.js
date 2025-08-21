const fetch = require('node-fetch');

async function eliminarFondoDesdeBuffer(buffer) {
  const base64Image = buffer.toString('base64');

  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      version: "a9758cbf62a0383cfddca5dd34f3b02d7c4d83763fbd3012cc93b0cf3d1cf853", // modelo de remove-bg
      input: {
        image: `data:image/png;base64,${base64Image}`
      }
    })
  });

  const data = await response.json();
  return data;
}
