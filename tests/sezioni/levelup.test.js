const {assert, fx} = require('../lib');
const openLU = async app => { await app.click('levelUp'); await app.page.waitForSelector('#modalBk [data-act="luApply"]'); };

module.exports = {sezione:'levelup', test:[
  ['livello 3 → 4 con PF medi (d10: 6 + Cos 2 = 8)', async ({open}) => {
    const app = await open(); await openLU(app);
    await app.page.locator('input[name="lu_asi"][value="feat"]').check();
    await app.click('luApply');
    const h = await app.hero();
    assert.deepStrictEqual([h.level, h.hp.max, h.hp.cur], [4, 40, 40]);
    assert.ok(h.xp >= 2700);
  }],
  ['aumento dei punteggi +2 (Des 14 → 16)', async ({open}) => {
    const app = await open(); await openLU(app);
    await app.set('#lu_a1', 'dex'); await app.click('luApply');
    assert.strictEqual((await app.hero()).abilities.dex, 16);
  }],
  ['+1/+1 sulla stessa caratteristica rifiutato', async ({open}) => {
    const app = await open(); await openLU(app);
    await app.page.locator('input[name="lu_asi"][value="split"]').check();
    await app.set('#lu_b1', 'str'); await app.set('#lu_b2', 'str');
    await app.click('luApply');
    assert.ok(/Pick two different abilities/.test(await app.toast()));
    assert.strictEqual((await app.hero()).level, 3);
  }],
  ['talento al posto dei punteggi', async ({open}) => {
    const app = await open(); await openLU(app);
    await app.page.locator('input[name="lu_asi"][value="feat"]').check();
    await app.set('#lu_feat', 'Grappler'); await app.click('luApply');
    assert.ok((await app.hero()).feats.some(f => f.n === 'Grappler'));
  }],
  ['al livello 3 si sceglie la sottoclasse', async ({open}) => {
    const app = await open({heroes:[fx.blank({class:'Wizard', level:2, abilities:{str:8,dex:14,con:13,int:16,wis:12,cha:10}})]});
    await openLU(app);
    assert.ok(await app.page.locator('#lu_sub').count(), 'manca la scelta della sottoclasse');
    await app.set('#lu_sub', 'Evoker'); await app.click('luApply');
    const h = await app.hero();
    assert.deepStrictEqual([h.level, h.subclass], [3, 'Evoker']);
  }],
  ['multiclasse: Valeria prende Rogue 1 (Des 14 ≥ 13)', async ({open}) => {
    const app = await open(); await openLU(app);
    await app.set('#lu_cls', 'new:Rogue');
    await app.page.waitForSelector('#modalBk [data-act="luApply"]');
    await app.click('luApply');
    const h = await app.hero();
    assert.strictEqual(h.level, 4); assert.deepStrictEqual(h.multi.map(m => [m.class, m.level]), [['Rogue', 1]]);
    // d8 medio 5 + Cos 2
    assert.strictEqual(h.hp.max, 39);
  }],
  ['multiclasse bloccata senza il punteggio minimo (Eldrin For 8 → Barbarian)', async ({open}) => {
    const app = await open({activeId:'teldrin'}); await openLU(app);
    assert.strictEqual(await app.page.locator('#lu_cls option[value="new:Barbarian"]').isDisabled(), true);
  }],
  ['livello 20: niente level up', async ({open}) => {
    const app = await open({heroes:[fx.blank({level:20, xp:355000})]});
    assert.strictEqual(await app.page.locator('#page [data-act="levelUp"]').count(), 0);
  }],
  ['doppio clic su "Become level" applica un solo livello', async ({open}) => {
    const app = await open(); await openLU(app);
    await app.page.locator('input[name="lu_asi"][value="feat"]').check();
    await app.page.locator('[data-act="luApply"]').dblclick().catch(() => {});
    await app.page.waitForTimeout(300);
    assert.strictEqual((await app.hero()).level, 4);
  }],
  ['aggiungi classe dalla pagina Eroe e livello totale massimo 20', async ({open}) => {
    const app = await open({heroes:[fx.blank({level:19})]});
    await app.click('mcAdd');
    let h = await app.hero(); assert.strictEqual(h.level, 20); assert.strictEqual(h.multi.length, 1);
    assert.strictEqual(await app.page.locator('[data-act="mcAdd"]').count(), 0);
  }],
  ['B-005 aumento +2 non abbassa un punteggio sopra 20', async ({open}) => {
    const app = await open({heroes:[fx.hero(fx.VALERIA, {abilities:{...fx.VALERIA.abilities, str:24}})]});
    await openLU(app);
    await app.set('#lu_a1', 'str'); await app.click('luApply');
    const s = (await app.hero()).abilities.str;
    assert.ok(s >= 24, `Forza scesa da 24 a ${s}`);
  }],
  ['B-021 Paladino 7 → 8: si sceglie aumento dei punteggi o talento', async ({open}) => {
    const app = await open({heroes:[fx.blank({class:'Paladin', subclass:'Devotion', level:7, abilities:{str:16,dex:10,con:14,int:8,wis:12,cha:14}, hp:{cur:60,max:60,temp:0}})]});
    await openLU(app);
    assert.ok(await app.page.locator('input[name="lu_asi"]').count(), 'nessuna scelta di aumento dei punteggi o talento al livello 8');
  }],
  ['B-021 Guerriero 5 → 6: si sceglie aumento dei punteggi o talento', async ({open}) => {
    const app = await open({heroes:[fx.blank({class:'Fighter', subclass:'Champion', level:5, abilities:{str:16,dex:14,con:14,int:10,wis:12,cha:8}, hp:{cur:44,max:44,temp:0}})]});
    await openLU(app);
    assert.ok(await app.page.locator('input[name="lu_asi"]').count(), 'nessuna scelta di aumento dei punteggi o talento al livello 6');
  }],
  ['B-022 +2 Costituzione al livello 4 alza i PF massimi anche per i livelli precedenti (28 → 40)', async ({open}) => {
    const app = await open({heroes:[fx.blank({class:'Paladin', subclass:'Devotion', level:3, abilities:{str:16,dex:10,con:14,int:8,wis:12,cha:14}, hp:{cur:28,max:28,temp:0}})]});
    await openLU(app);
    await app.set('#lu_a1', 'con'); await app.click('luApply');
    const h = await app.hero();
    assert.strictEqual(h.abilities.con, 16);
    assert.strictEqual(h.hp.max, 40, `PF massimi ${h.hp.max}: 10 + 3 × 6 + 4 × Cos 3 = 40`);
  }],
  ['B-025 un talento non ripetibile già preso (Alert) non viene offerto di nuovo', async ({open}) => {
    const app = await open(); await openLU(app);
    const opts = await app.page.$$eval('#lu_feat option', o => o.map(x => x.value));
    assert.ok(!opts.includes('Alert'), 'Alert offerto anche se Valeria lo ha già');
  }],
  ['B-021 Ladro 9 → 10: si sceglie aumento dei punteggi o talento (livello extra del Ladro)', async ({open}) => {
    const app = await open({heroes:[fx.blank({class:'Rogue', subclass:'Thief', level:9, abilities:{str:10,dex:18,con:14,int:12,wis:12,cha:10}, hp:{cur:65,max:65,temp:0}})]});
    await openLU(app);
    assert.ok(await app.page.locator('input[name="lu_asi"]').count(), 'nessuna scelta di aumento dei punteggi o talento al livello 10');
  }],
  ['B-021 Mago 11 → 12: si sceglie aumento dei punteggi o talento', async ({open}) => {
    const app = await open({heroes:[fx.blank({class:'Wizard', subclass:'Evoker', level:11, abilities:{str:8,dex:14,con:14,int:20,wis:12,cha:10}, hp:{cur:68,max:68,temp:0}})]});
    await openLU(app);
    assert.ok(await app.page.locator('input[name="lu_asi"]').count(), 'nessuna scelta di aumento dei punteggi o talento al livello 12');
  }],
  ['livello 18 → 19: si sceglie un Epic Boon e il punteggio può superare 20', async ({open}) => {
    const app = await open({heroes:[fx.blank({class:'Fighter', subclass:'Champion', level:18, xp:265000, abilities:{str:20,dex:14,con:16,int:10,wis:12,cha:8}, hp:{cur:180,max:180,temp:0}})]});
    await openLU(app);
    assert.ok(/Epic Boon/.test(await app.text('#modalBk .modal')), 'manca la sezione Epic Boon al livello 19');
    await app.page.locator('input[name="lu_asi"][value="feat"]').check();
    await app.set('#lu_feat', 'Boon of Combat Prowess'); await app.set('#lu_boonab', 'str'); await app.click('luApply');
    const h = await app.hero();
    assert.deepStrictEqual([h.level, h.abilities.str], [19, 21]);
    assert.ok(h.feats.some(f => f.n === 'Boon of Combat Prowess'));
  }],
  ['multiclasse: avanzare la seconda classe (Fighter 3 / Rogue 1 → Rogue 2, PF d8 medi 5 + Cos 2)', async ({open}) => {
    const app = await open({heroes:[fx.hero(fx.VALERIA, {level:4, xp:2700, multi:[{class:'Rogue', subclass:'', level:1}], hp:{cur:39,max:39,temp:0}})]});
    await app.click('levelUp'); await app.page.waitForSelector('#lu_cls');
    await app.set('#lu_cls', '1');
    await app.page.waitForSelector('#modalBk [data-act="luApply"]');
    await app.click('luApply');
    const h = await app.hero();
    assert.strictEqual(h.level, 5);
    assert.deepStrictEqual(h.multi.map(m => [m.class, m.level]), [['Rogue', 2]]);
    assert.strictEqual(h.hp.max, 46);
  }],
  ['PF tirati: senza premere Roll il livello non viene applicato', async ({open}) => {
    const app = await open(); await openLU(app);
    await app.page.locator('input[name="lu_hp"][value="roll"]').check();
    await app.page.locator('input[name="lu_asi"][value="feat"]').check();
    await app.click('luApply');
    assert.ok(/Roll first/.test(await app.toast()), 'nessun avviso');
    assert.strictEqual((await app.hero()).level, 3);
  }],
  ['B-027 livello 18 → 19: +2 ai punteggi (aumento, non Epic Boon) non porta Intelligenza oltre 20', async ({open}) => {
    const app = await open({heroes:[fx.blank({class:'Wizard', subclass:'Evoker', level:18, xp:265000, abilities:{str:10,dex:14,con:14,int:20,wis:12,cha:10}, hp:{cur:110,max:110,temp:0}})]});
    await openLU(app);
    await app.set('#lu_a1', 'int'); await app.click('luApply');
    const h = await app.hero();
    assert.strictEqual(h.level, 19);
    assert.ok(h.abilities.int <= 20, `Intelligenza ${h.abilities.int}: l'aumento dei punteggi arriva al massimo a 20`);
  }],
  ['B-028 multiclasse nella pagina Eroe: una riga non può diventare una classe che l\'eroe ha già', async ({open}) => {
    const app = await open({heroes:[fx.hero(fx.VALERIA, {level:4, xp:2700, multi:[{class:'Rogue', subclass:'', level:1}], hp:{cur:39,max:39,temp:0}})]});
    const opts = await app.page.$$eval('select[data-mc="0:class"] option', o => o.map(x => x.value));
    assert.ok(opts.includes('Rogue'), 'manca la classe attuale della riga');
    assert.ok(!opts.includes('Fighter'), 'la riga Rogue offre Fighter, che è già la classe principale (Fighter 3 / Fighter 1)');
  }],
  ['B-031 talento Grappler al livello 4: +1 a Forza o Destrezza', async ({open}) => {
    const app = await open(); await openLU(app);
    await app.page.locator('input[name="lu_asi"][value="feat"]').check();
    await app.set('#lu_feat', 'Grappler'); await app.click('luApply');
    const h = await app.hero();
    assert.strictEqual(h.abilities.str + h.abilities.dex, 31, `For ${h.abilities.str}, Des ${h.abilities.dex} (prima 16 e 14)`);
  }],
  ['B-033 multiclasse: il menu della classe principale non offre una classe già presente nelle righe (Fighter 3 / Rogue 1)', async ({open}) => {
    const app = await open({heroes:[fx.hero(fx.VALERIA, {level:4, xp:2700, multi:[{class:'Rogue', subclass:'', level:1}], hp:{cur:39,max:39,temp:0}})]});
    const opts = await app.page.$$eval('#f_class option', o => o.map(x => x.value));
    if (opts.includes('Rogue')) await app.set('#f_class', 'Rogue');
    const h = await app.hero(), all = [h.class, ...h.multi.map(m => m.class)];
    assert.strictEqual(new Set(all).size, all.length, `classe doppia dopo aver scelto Rogue come classe principale: ${all.join(' / ')}`);
  }],
]};
