// Eroi di prova con id fissi (copie degli eroi di esempio dell'app), così i test sono ripetibili.
const clone = x => JSON.parse(JSON.stringify(x));

const VALERIA = {id:'tvaleria', portrait:'⚔️', name:'Valeria Thorne', class:'Fighter', subclass:'Champion', level:3, species:'Human', background:'Soldier', alignment:'Lawful Good', xp:900, inspiration:true,
  abilities:{str:16,dex:14,con:15,int:10,wis:12,cha:11}, hp:{cur:32,max:32,temp:0}, hitDice:{used:0}, death:{s:0,f:0}, exhaustion:0, conditions:[],
  saves:{str:1,con:1}, skills:{athletics:1,intimidation:1,perception:1,survival:0},
  attacks:[{n:'Longsword', bonus:5, dmg:'1d8+3 Slashing', note:'Versatile (1d10) · Mastery: Sap'},{n:'Javelin', bonus:5, dmg:'1d6+3 Piercing', note:'Thrown 30/120 · Mastery: Slow'}],
  feats:[{n:'Savage Attacker', src:'Background (Soldier)'},{n:'Alert', src:'Human (Versatile)'}], classFeats:['Improved Critical (19–20)'],
  spells:{known:[], prep:[], slots:{}}, inventory:[{n:'Chain Mail',q:1,d:'AC 16'},{n:'Shield',q:1,d:'+2 AC'},{n:'Healer’s Kit',q:1,d:'10 uses'},{n:'Potion of Healing',q:2,d:''},{n:'Bedroll',q:1,d:''},{n:'Rope',q:1,d:'50 ft. hempen'},{n:'Silver locket',q:1,d:'Portrait of her sister',custom:true,cat:'Treasure & Valuables',type:'Trinket',val:'25 gp',wt:0}], currency:{cp:12,sp:30,ep:0,gp:45,pp:0},
  notes:{look:'Scarred cheek, braided black hair, crimson cloak.', story:'A city guardsman who took up the adventuring road.', allies:'Squire Pip.', extra:'Owes 50 gp to the temple.'}};

const ELDRIN = {id:'teldrin', portrait:'🧙', name:'Eldrin Moonwhisper', class:'Wizard', subclass:'Evoker', level:4, species:'Elf', background:'Sage', alignment:'Neutral Good', xp:2700, inspiration:false,
  abilities:{str:8,dex:14,con:13,int:17,wis:12,cha:10}, hp:{cur:24,max:24,temp:0}, hitDice:{used:0}, death:{s:0,f:0}, exhaustion:0, conditions:[],
  saves:{int:1,wis:1}, skills:{arcana:2,history:1,investigation:1,insight:0},
  attacks:[{n:'Fire Bolt', bonus:5, dmg:'1d10 Fire', note:'Spell attack · 120 ft.'}],
  feats:[{n:'Magic Initiate (Wizard)', src:'Background (Sage)'}], classFeats:[],
  spells:{known:['Fire Bolt','Light','Mage Hand','Minor Illusion','Burning Hands','Detect Magic','Mage Armor','Shield','Sleep','Misty Step','Scorching Ray','Shatter','Web'], prep:['Burning Hands','Detect Magic','Shield','Misty Step','Scorching Ray','Shatter','Web'], slots:{}},
  inventory:[{n:'Spellbook',q:1,d:'All known spells'},{n:'Component Pouch',q:1,d:''},{n:'Robe',q:1,d:''},{n:'Ring of Protection',q:1,d:'',attuned:true},{n:'Cloak of Protection',q:1,d:'Found in the Spire vault'},{n:'Wand of Magic Missiles',q:1,d:'7 charges'}], currency:{cp:5,sp:10,ep:2,gp:120,pp:0},
  notes:{look:'Silver hair.', story:'Apprentice of the Spire.', allies:'Familiar: owl Archimedes.', extra:'Fear of deep water.'}};

const KESSA = {id:'tkessa', portrait:'🏹', name:'Kessa Quickpaw', class:'Rogue', subclass:'Thief', level:2, species:'Halfling', background:'Criminal', alignment:'Chaotic Good', xp:300, inspiration:true,
  abilities:{str:10,dex:16,con:12,int:13,wis:14,cha:14}, hp:{cur:15,max:15,temp:0}, hitDice:{used:0}, death:{s:0,f:0}, exhaustion:0, conditions:[],
  saves:{dex:1,int:1}, skills:{stealth:2,sleight:2,deception:1,acrobatics:1,perception:1},
  attacks:[{n:'Shortsword', bonus:5, dmg:'1d6+3 Piercing', note:'Finesse, Light'}],
  feats:[{n:'Alert', src:'Background (Criminal)'}], classFeats:[],
  spells:{known:[], prep:[], slots:{}}, inventory:[{n:'Leather Armor',q:1,d:'AC 11 + Dex'},{n:'Thieves’ Tools',q:1,d:'Expertise'},{n:'Cloak of Elvenkind',q:1,d:'',attuned:true},{n:'Bag of Holding',q:1,d:''}], currency:{cp:20,sp:15,ep:0,gp:28,pp:0},
  notes:{look:'Curly chestnut hair.', story:'Ran a shell game in Port Merrow.', allies:'Contact: Fen.', extra:'Always pays debts.'}};

function hero(base, over = {}){ return Object.assign(clone(base), over); }
// eroe minimo valido, per i casi costruiti apposta
let nBlank = 0;
function blank(over = {}){
  return Object.assign({id:'tblank' + (++nBlank), portrait:'🧝', name:'Prova', class:'Fighter', subclass:'', level:1, species:'Human', background:'Soldier', alignment:'True Neutral', xp:0,
    abilities:{str:10,dex:10,con:10,int:10,wis:10,cha:10}, hp:{cur:10,max:10,temp:0}, hitDice:{used:0}, death:{s:0,f:0}, exhaustion:0, conditions:[],
    saves:{}, skills:{}, attacks:[], feats:[], classFeats:[], spells:{known:[], prep:[], slots:{}}, inventory:[], currency:{cp:0,sp:0,ep:0,gp:0,pp:0}, notes:{}}, over);
}
const party = () => [clone(VALERIA), clone(ELDRIN), clone(KESSA)];

module.exports = {VALERIA, ELDRIN, KESSA, hero, blank, party, clone};
