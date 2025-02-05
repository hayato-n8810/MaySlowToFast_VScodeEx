export async function callAPI(precode: string) {
    const res = await fetch(`https://mayslowtofastapi.onrender.com/${precode}`);
    const data = await res.json();
    return data;
}
