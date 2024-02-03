async function getBitMupp(bitMuppId, tokenOsu) {
  let res = await fetch(`https://osu.ppy.sh/api/v2/beatmaps/${bitMuppId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${tokenOsu}`,
    },
  });
  res = await res.json();
  return res;
}

module.exports = getBitMupp;
