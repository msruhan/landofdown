/**
 * Import 127 heroes via API (same as admin form).
 *
 * Cara pakai:
 * 1. Login ke https://ml-stat.ink17.uk/admin (atau domain Anda)
 * 2. Buka halaman /admin/heroes (biarkan tab ini aktif)
 * 3. DevTools (F12) → tab Console
 * 4. Paste seluruh isi file ini, Enter
 *
 * Hero yang sudah ada (nama sama) akan dilewati (422).
 */
(async () => {
  const token = localStorage.getItem("auth_token");
  if (!token) {
    console.error("Belum login: buka /admin/login dan login dulu.");
    return;
  }
  const heroes = [{"name":"Lesley","hero_role":"Marksman\/Assassin","lane":"jungle"},{"name":"Bruno","hero_role":"Marksman","lane":"gold"},{"name":"Brody","hero_role":"Marksman","lane":"gold"},{"name":"Beatrix","hero_role":"Marksman","lane":"gold"},{"name":"Melissa","hero_role":"Marksman","lane":"gold"},{"name":"Wanwan","hero_role":"Marksman","lane":"gold"},{"name":"Yu Zhong","hero_role":"Fighter","lane":"exp"},{"name":"Esmeralda","hero_role":"Mage\/Tank","lane":"mid"},{"name":"Thamuz","hero_role":"Fighter","lane":"exp"},{"name":"Guinevere","hero_role":"Fighter","lane":"exp"},{"name":"Paquito","hero_role":"Fighter\/Assassin","lane":"jungle"},{"name":"Cici","hero_role":"Fighter","lane":"exp"},{"name":"Yve","hero_role":"Mage","lane":"mid"},{"name":"Valentina","hero_role":"Mage","lane":"mid"},{"name":"Xavier","hero_role":"Mage","lane":"mid"},{"name":"Pharsa","hero_role":"Mage","lane":"mid"},{"name":"Kagura","hero_role":"Mage","lane":"mid"},{"name":"Lunox","hero_role":"Mage","lane":"mid"},{"name":"Ling","hero_role":"Assassin","lane":"jungle"},{"name":"Fanny","hero_role":"Assassin","lane":"jungle"},{"name":"Lancelot","hero_role":"Assassin","lane":"jungle"},{"name":"Hayabusa","hero_role":"Assassin","lane":"jungle"},{"name":"Aamon","hero_role":"Assassin","lane":"jungle"},{"name":"Joy","hero_role":"Assassin","lane":"jungle"},{"name":"Khufra","hero_role":"Tank","lane":"roam"},{"name":"Atlas","hero_role":"Tank","lane":"roam"},{"name":"Chou","hero_role":"Fighter","lane":"exp"},{"name":"Tigreal","hero_role":"Tank","lane":"roam"},{"name":"Franco","hero_role":"Tank","lane":"roam"},{"name":"Akai","hero_role":"Tank","lane":"roam"},{"name":"Saber","hero_role":"Assassin","lane":"jungle"},{"name":"Karina","hero_role":"Assassin","lane":"jungle"},{"name":"Natalia","hero_role":"Assassin","lane":"jungle"},{"name":"Helcurt","hero_role":"Assassin","lane":"jungle"},{"name":"Gusion","hero_role":"Assassin","lane":"jungle"},{"name":"Hanzo","hero_role":"Assassin","lane":"jungle"},{"name":"Nolan","hero_role":"Assassin","lane":"jungle"},{"name":"Benedetta","hero_role":"Assassin\/Fighter","lane":"jungle"},{"name":"Harley","hero_role":"Assassin\/Mage","lane":"jungle"},{"name":"Selena","hero_role":"Assassin\/Mage","lane":"jungle"},{"name":"Yi Shun Shin","hero_role":"Assassin\/Marksman","lane":"jungle"},{"name":"Suyou","hero_role":"Assassin\/Fighter","lane":"jungle"},{"name":"Bane","hero_role":"Fighter\/Mage","lane":"mid"},{"name":"Julian","hero_role":"Fighter\/Mage","lane":"mid"},{"name":"Nana","hero_role":"Mage","lane":"mid"},{"name":"Eudora","hero_role":"Mage","lane":"mid"},{"name":"Gord","hero_role":"Mage","lane":"mid"},{"name":"Cyclops","hero_role":"Mage","lane":"mid"},{"name":"Aurora","hero_role":"Mage","lane":"mid"},{"name":"Vexana","hero_role":"Mage","lane":"mid"},{"name":"Odette","hero_role":"Mage","lane":"mid"},{"name":"Zhask","hero_role":"Mage","lane":"mid"},{"name":"Valir","hero_role":"Mage","lane":"mid"},{"name":"Chang'e","hero_role":"Mage","lane":"mid"},{"name":"Vale","hero_role":"Mage","lane":"mid"},{"name":"Harith","hero_role":"Mage","lane":"mid"},{"name":"Lylia","hero_role":"Mage","lane":"mid"},{"name":"Cecilion","hero_role":"Mage","lane":"mid"},{"name":"Luo Yi","hero_role":"Mage","lane":"mid"},{"name":"Novaria","hero_role":"Mage","lane":"mid"},{"name":"Kadita","hero_role":"Mage\/Assassin","lane":"jungle"},{"name":"Alice","hero_role":"Mage\/Tank","lane":"mid"},{"name":"Zhuxin","hero_role":"Mage","lane":"mid"},{"name":"Balmond","hero_role":"Fighter","lane":"exp"},{"name":"Freya","hero_role":"Fighter","lane":"exp"},{"name":"Sun","hero_role":"Fighter","lane":"exp"},{"name":"Alpha","hero_role":"Fighter","lane":"exp"},{"name":"Lapu Lapu","hero_role":"Fighter","lane":"exp"},{"name":"Argus","hero_role":"Fighter","lane":"exp"},{"name":"Jawhead","hero_role":"Fighter","lane":"exp"},{"name":"Martis","hero_role":"Fighter","lane":"exp"},{"name":"Aldous","hero_role":"Fighter","lane":"exp"},{"name":"Leomord","hero_role":"Fighter","lane":"exp"},{"name":"Minsitthar","hero_role":"Fighter","lane":"exp"},{"name":"Badang","hero_role":"Fighter","lane":"exp"},{"name":"Terizla","hero_role":"Fighter","lane":"exp"},{"name":"XBorg","hero_role":"Fighter","lane":"exp"},{"name":"Dyrroth","hero_role":"Fighter","lane":"exp"},{"name":"Silvanna","hero_role":"Fighter","lane":"exp"},{"name":"Khaleed","hero_role":"Fighter","lane":"exp"},{"name":"Phoveus","hero_role":"Fighter","lane":"exp"},{"name":"Aulus","hero_role":"Fighter","lane":"exp"},{"name":"Alucard","hero_role":"Fighter\/Assassin","lane":"jungle"},{"name":"Zilong","hero_role":"Fighter\/Assassin","lane":"jungle"},{"name":"Yin","hero_role":"Fighter\/Assassin","lane":"jungle"},{"name":"Arlott","hero_role":"Fighter\/Assassin","lane":"jungle"},{"name":"Roger","hero_role":"Fighter\/Marksman","lane":"gold"},{"name":"Ruby","hero_role":"Fighter\/Tank","lane":"roam"},{"name":"Hilda","hero_role":"Fighter\/Tank","lane":"roam"},{"name":"Masha","hero_role":"Fighter\/Tank","lane":"roam"},{"name":"Fredrinn","hero_role":"Fighter\/Tank","lane":"roam"},{"name":"Lukas","hero_role":"Fighter","lane":"exp"},{"name":"Miya","hero_role":"Marksman","lane":"gold"},{"name":"Clint","hero_role":"Marksman","lane":"gold"},{"name":"Layla","hero_role":"Marksman","lane":"gold"},{"name":"Moskov","hero_role":"Marksman","lane":"gold"},{"name":"Irithel","hero_role":"Marksman","lane":"gold"},{"name":"Hanabi","hero_role":"Marksman","lane":"gold"},{"name":"Claude","hero_role":"Marksman","lane":"gold"},{"name":"Granger","hero_role":"Marksman","lane":"gold"},{"name":"WanWan","hero_role":"Marksman","lane":"gold"},{"name":"Popol and Kupa","hero_role":"Marksman","lane":"gold"},{"name":"Natan","hero_role":"Marksman","lane":"gold"},{"name":"Ixia","hero_role":"Marksman","lane":"gold"},{"name":"Kimmy","hero_role":"Marksman\/Mage","lane":"gold"},{"name":"Rafaela","hero_role":"Support","lane":"roam"},{"name":"Estes","hero_role":"Support","lane":"roam"},{"name":"Diggie","hero_role":"Support","lane":"roam"},{"name":"Angela","hero_role":"Support","lane":"roam"},{"name":"Floryn","hero_role":"Support","lane":"roam"},{"name":"Mathilda","hero_role":"Support\/Assassin","lane":"jungle"},{"name":"Kaja","hero_role":"Support\/Fighter","lane":"roam"},{"name":"Faramis","hero_role":"Support\/Mage","lane":"mid"},{"name":"Lolita","hero_role":"Support\/Tank","lane":"roam"},{"name":"Carmilla","hero_role":"Support\/Tank","lane":"roam"},{"name":"Chip","hero_role":"Support\/Tank","lane":"roam"},{"name":"Hylos","hero_role":"Tank","lane":"roam"},{"name":"Uranus","hero_role":"Tank","lane":"roam"},{"name":"Belerick","hero_role":"Tank","lane":"roam"},{"name":"Baxia","hero_role":"Tank","lane":"roam"},{"name":"Gloo","hero_role":"Tank","lane":"roam"},{"name":"Gatot Kaca","hero_role":"Tank\/Fighter","lane":"roam"},{"name":"Grock","hero_role":"Tank\/Fighter","lane":"roam"},{"name":"Barats","hero_role":"Tank\/Fighter","lane":"roam"},{"name":"Edith","hero_role":"Tank\/Marksman","lane":"gold"},{"name":"Minotaur","hero_role":"Tank\/Support","lane":"roam"},{"name":"Johnson","hero_role":"Tank\/Support","lane":"roam"}];
  const rr = await fetch("/api/roles");
  const roles = await rr.json();
  const list = Array.isArray(roles) ? roles : roles.data || [];
  const roleByLane = Object.fromEntries(list.map((r) => [r.name, r.id]));
  let ok = 0;
  let skipped = 0;
  let failed = 0;
  for (const h of heroes) {
    const body = {
      name: h.name,
      hero_role: h.hero_role,
      lane: h.lane,
      role_id: h.lane ? roleByLane[h.lane] ?? null : null,
    };
    const r = await fetch("/api/admin/heroes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify(body),
    });
    if (r.status === 201) {
      ok++;
      console.log("[OK]", h.name);
    } else if (r.status === 422) {
      skipped++;
      console.warn("[SKIP]", h.name, await r.text());
    } else {
      failed++;
      console.error("[ERR]", h.name, r.status, await r.text());
    }
    await new Promise((x) => setTimeout(x, 120));
  }
  console.log("Selesai:", { dibuat: ok, dilewati_atau_duplikat: skipped, gagal: failed });
})();