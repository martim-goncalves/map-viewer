export async function octomap2json(file) {
  // Set file as form data 
  const formData = new FormData();
  formData.append('file', file);

  // Request converted map (.ot --> .json)
  const res = await fetch('/convert', {
    method: 'POST',
    body: formData
  });

  // Handle error result
  if (!res.ok) {
    const err = await res.text();
    throw new Error(
      `Conversion failed: ${res.status} ${res.statusText} - ${err}`
    );
  }

  // Wait for result
  return await res.json();
}
