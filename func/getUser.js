async function getUser(user, tokenOsu) {
  let res = await fetch(`https://osu.ppy.sh/api/v2/users/${user}/osu`, {
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

module.exports = getUser;
