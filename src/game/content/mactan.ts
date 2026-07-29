import type { ArcContent } from "./types";

/**
 * Mactan arc (Lapu-Lapu, 27 April 1521).
 * Script source of truth: docs/story-mactan.md (review notes + historical
 * verification flags live there — keep the two in sync when editing).
 *
 * The pupil plays a fictional ally: an unnamed young seafarer of Mactan whose
 * knowledge of the reef is what makes them useful. Every decision converges on
 * the real historical outcome.
 */
export const mactanArc: ArcContent = {
  arc: "mactan",
  title: { fil: "Labanan sa Mactan", en: "The Battle of Mactan" },

  // Item bank: each objective carries two parallel items of equal difficulty,
  // so the pre-test and post-test ask different questions about the same thing.
  assessment: {
    objectives: [
      {
        id: "mac_obj_opponent",
        description: {
          fil: "Nakikilala kung sinong dayuhang pinuno ang natalo sa Mactan.",
          en: "Identifies which foreign leader was defeated at Mactan.",
        },
        items: [
          {
            id: "mac_opponent_a",
            question: {
              fil: "Sino ang natalo ni Lapu-Lapu sa Labanan sa Mactan?",
              en: "Who did Lapu-Lapu defeat at the Battle of Mactan?",
            },
            choices: [
              { id: "a", label: { fil: "Ferdinand Magellan", en: "Ferdinand Magellan" } },
              { id: "b", label: { fil: "Miguel Lopez de Legazpi", en: "Miguel Lopez de Legazpi" } },
              { id: "c", label: { fil: "Rajah Humabon", en: "Rajah Humabon" } },
              { id: "d", label: { fil: "Andres Bonifacio", en: "Andres Bonifacio" } },
            ],
            correctChoiceId: "a",
          },
          {
            id: "mac_opponent_b",
            question: {
              fil: "Sinong pinunong dayuhan ang nasawi sa Labanan sa Mactan?",
              en: "Which foreign captain died at the Battle of Mactan?",
            },
            choices: [
              { id: "a", label: { fil: "Ferdinand Magellan", en: "Ferdinand Magellan" } },
              { id: "b", label: { fil: "Miguel Lopez de Legazpi", en: "Miguel Lopez de Legazpi" } },
              { id: "c", label: { fil: "Antonio Pigafetta", en: "Antonio Pigafetta" } },
              { id: "d", label: { fil: "Rajah Humabon", en: "Rajah Humabon" } },
            ],
            correctChoiceId: "a",
          },
        ],
      },
      {
        id: "mac_obj_place",
        description: {
          fil: "Natutukoy kung saan naganap ang labanan.",
          en: "Locates where the battle took place.",
        },
        items: [
          {
            id: "mac_place_a",
            question: {
              fil: "Saan naganap ang Labanan sa Mactan?",
              en: "Where did the Battle of Mactan take place?",
            },
            choices: [
              { id: "a", label: { fil: "Maynila", en: "Manila" } },
              { id: "b", label: { fil: "Mactan, Cebu", en: "Mactan, Cebu" } },
              { id: "c", label: { fil: "Davao", en: "Davao" } },
              { id: "d", label: { fil: "Batangas", en: "Batangas" } },
            ],
            correctChoiceId: "b",
          },
          {
            id: "mac_place_b",
            question: {
              fil: "Sa aling pulo lumaban si Lapu-Lapu sa mga dayuhan?",
              en: "On which island did Lapu-Lapu fight the strangers?",
            },
            choices: [
              { id: "a", label: { fil: "Pulo ng Mactan", en: "The island of Mactan" } },
              { id: "b", label: { fil: "Pulo ng Panay", en: "The island of Panay" } },
              { id: "c", label: { fil: "Pulo ng Samar", en: "The island of Samar" } },
              { id: "d", label: { fil: "Pulo ng Mindoro", en: "The island of Mindoro" } },
            ],
            correctChoiceId: "a",
          },
        ],
      },
      {
        id: "mac_obj_tactic",
        description: {
          fil: "Naipaliliwanag kung bakit nakalamang ang Mactan — ang mababaw na tubig.",
          en: "Explains why Mactan had the advantage — the shallow water.",
        },
        items: [
          {
            id: "mac_tactic_a",
            question: {
              fil: "Bakit hindi makalapit ang malalaking barko ng mga dayuhan sa Mactan?",
              en: "Why could the strangers' big ships not come close to Mactan?",
            },
            choices: [
              { id: "a", label: { fil: "Masyadong malakas ang hangin", en: "The wind was too strong" } },
              { id: "b", label: { fil: "Mababaw ang tubig at may bahura", en: "The water was shallow and full of coral" } },
              { id: "c", label: { fil: "Nawala ang kanilang mapa", en: "They lost their map" } },
              { id: "d", label: { fil: "Wala silang pagkain", en: "They had no food" } },
            ],
            correctChoiceId: "b",
          },
          {
            id: "mac_tactic_b",
            question: {
              fil: "Ano ang naging kalamangan ng mga taga-Mactan sa labanan?",
              en: "What gave the people of Mactan the advantage in the battle?",
            },
            choices: [
              { id: "a", label: { fil: "Mas marami silang baril", en: "They had more guns" } },
              { id: "b", label: { fil: "Mas malalaki ang kanilang barko", en: "They had bigger ships" } },
              { id: "c", label: { fil: "Kabisado nila ang mababaw na tubig", en: "They knew the shallow water" } },
              { id: "d", label: { fil: "Mas mabigat ang kanilang baluti", en: "They had heavier armour" } },
            ],
            correctChoiceId: "c",
          },
        ],
      },
    ],
  },

  nodes: [
    {
      id: "mac_title",
      type: "titlecard",
      place: { fil: "Mactan", en: "Mactan" },
      year: "1521",
    },

    // M1 — hook
    {
      id: "mac_s1",
      type: "story",
      text: {
        fil:
          "Madilim pa nang ginising ka ng katahimikan.\n" +
          "Walang ibon. Walang alon sa bahura.\n" +
          "Tumakbo ka sa dalampasigan — at doon mo sila nakita.\n" +
          "Mga layag. Malalaki. Hindi galing dito.",
        en:
          "It was still dark when the silence woke you.\n" +
          "No birds. No waves on the reef.\n" +
          "You ran to the shore — and there they were.\n" +
          "Sails. Huge ones. Not from here.",
      },
    },

    // M2 — the ally (you)
    {
      id: "mac_char_you",
      type: "character",
      name: { fil: "Ikaw", en: "You" },
      role: { fil: "Batang mandaragat ng Mactan", en: "A young seafarer of Mactan" },
      historicity: "fictional",
      image: "mactan/char_ally",
      lines: [
        {
          fil: "Araw-araw kang nangingisda sa mababaw na tubig.",
          en: "Every day you fish in the shallow water.",
        },
        {
          fil: "Kabisado mo kung saan matalim ang bato at kung saan sumasadsad ang bangka.",
          en: "You know where the coral is sharp, and where a boat runs aground.",
        },
        {
          fil: "Walang mapa ang mga dayuhan. Ikaw ang mapa.",
          en: "The strangers have no map. You are the map.",
        },
      ],
    },

    // M3 — Lapu-Lapu
    {
      id: "mac_char_lapulapu",
      type: "character",
      name: { fil: "Lapu-Lapu", en: "Lapu-Lapu" },
      role: { fil: "Datu ng Mactan", en: "Datu of Mactan" },
      historicity: "real",
      image: "mactan/char_lapulapu",
      lines: [
        {
          fil: "Hindi siya sumisigaw. Nakatingin lang siya sa dagat, matagal.",
          en: "He does not shout. He only looks at the sea, for a long time.",
        },
        {
          fil: "Layunin niya: manatiling malaya ang Mactan at ligtas ang mga tao nito.",
          en: "His goal: to keep Mactan free and its people safe.",
        },
        {
          fil: "“Ilang taon kong binantayan ang tubig na ito. Hindi ko ipauubaya sa hindi kilala ang lasa ng asin nito.”",
          en: "“I have guarded this water for years. I will not hand it to someone who has never tasted its salt.”",
        },
      ],
    },

    // M4 — why they came
    {
      id: "mac_s2a",
      type: "story",
      text: {
        fil:
          "Malayo ang pinanggalingan nila — mga buwan ang layo.\n" +
          "Naghahanap sila ng pampalasa: klabo, kanela, paminta.\n" +
          "Sa kanilang lupain, kasinghalaga ito ng ginto.",
        en:
          "They came from far away — months of sailing.\n" +
          "They were looking for spices: cloves, cinnamon, pepper.\n" +
          "In their land, those were worth as much as gold.",
      },
    },
    {
      id: "mac_s2b",
      type: "story",
      text: {
        fil:
          "Ngunit hindi lang pampalasa ang hinahanap nila.\n" +
          "Gusto rin nilang tawaging kanila ang mga pulo —\n" +
          "at ang mga tao rito.",
        en:
          "But spices were not all they wanted.\n" +
          "They also wanted to call these islands theirs —\n" +
          "and the people in them.",
      },
    },

    // M5 — Magellan
    {
      id: "mac_char_magellan",
      type: "character",
      name: { fil: "Ferdinand Magellan", en: "Ferdinand Magellan" },
      role: { fil: "Kapitan ng mga dayuhang barko", en: "Captain of the foreign ships" },
      historicity: "real",
      image: "mactan/char_magellan",
      lines: [
        {
          fil: "Matapang siya at hindi sumusuko. Naglakbay siya nang mas malayo kaysa halos sinuman noon.",
          en: "He is brave and does not give up. He has sailed farther than almost anyone alive.",
        },
        {
          fil: "Layunin niya: angkinin ang mga pulo para sa hari ng Espanya.",
          en: "His goal: to claim these islands for the king of Spain.",
        },
        {
          fil: "May hindi niya pinag-aralan: ang tubig. Akala niya, sapat na ang baluti at baril.",
          en: "But one thing he never studied: the water. He believes armour and guns are enough.",
        },
      ],
    },

    // M6 — Humabon's choice
    {
      id: "mac_s3a",
      type: "story",
      text: {
        fil:
          "Sa kabilang pulo, sa Cebu, may pinuno — si Rajah Humabon.\n" +
          "Nakipagkasundo siya sa mga dayuhan. Nagpabinyag siya.",
        en:
          "On the other island, in Cebu, there was a leader — Rajah Humabon.\n" +
          "He made peace with the strangers. He was baptised.",
      },
    },
    {
      id: "mac_s3b",
      type: "story",
      text: {
        fil:
          "Para sa kaniya, kaligtasan at kalakalan ang tama.\n" +
          "Hindi siya duwag. Iba lang ang napili niyang daan.\n" +
          "Sa Mactan, iba ang pasya.",
        en:
          "For him, safety and trade were the right choice.\n" +
          "He was not a coward. He simply chose a different road.\n" +
          "In Mactan, the answer was different.",
      },
    },

    // M7 — the demand
    {
      id: "mac_s4a",
      type: "story",
      text: {
        fil:
          "Dumating ang mensahe sa Mactan.\n" +
          "Magbigay ng pagkain. Magbayad ng buwis.\n" +
          "Kilalanin ang hari sa malayo.",
        en:
          "The message reached Mactan.\n" +
          "Give food. Pay tribute.\n" +
          "Bow to a king across the sea.",
      },
    },
    {
      id: "mac_s4b",
      type: "story",
      text: {
        fil:
          "Tumayo si Lapu-Lapu sa harap ng mga tao.\n" +
          "“Hindi kami tumatanggi sa panauhin,” sabi niya.\n" +
          "“Tumatanggi kami sa panginoon.”",
        en:
          "Lapu-Lapu stood before his people.\n" +
          "“We do not refuse a guest,” he said.\n" +
          "“We refuse a master.”",
      },
    },
    {
      id: "mac_s4c",
      type: "story",
      text: {
        fil:
          "Ramdam mo ang kilabot sa iyong batok.\n" +
          "Wala nang aatras.",
        en:
          "You felt a chill on your neck.\n" +
          "No one was turning back now.",
      },
    },

    // M8 — the plan (teachable core)
    {
      id: "mac_s5a",
      type: "story",
      text: {
        fil:
          "Ngunit hindi lakas ang plano ni Lapu-Lapu. Talino.\n" +
          "“Mabigat ang kanilang barko,” sabi niya.\n" +
          "“Mababaw ang ating tubig.”",
        en:
          "But Lapu-Lapu's plan was not strength. It was cleverness.\n" +
          "“Their ships are heavy,” he said.\n" +
          "“Our water is shallow.”",
      },
    },
    {
      id: "mac_s5b",
      type: "story",
      text: {
        fil:
          "“Hindi sila makakalapit. Kailangan nilang maglakad sa dagat.”\n" +
          "Napatingin siya sa iyo.\n" +
          "“Batang mandaragat — kabisado mo ang bahura, hindi ba?”",
        en:
          "“They cannot come close. They will have to walk through the sea.”\n" +
          "He looked at you.\n" +
          "“Young seafarer — you know the reef, don't you?”",
      },
    },
    {
      id: "mac_s5c",
      type: "story",
      text: {
        fil:
          "Tumango ka.\n" +
          "Sa unang pagkakataon, hindi ka masyadong maliit.",
        en:
          "You nodded.\n" +
          "For the first time, you were not too small.",
      },
    },

    // M9 — decision (all paths converge)
    {
      id: "mac_decision",
      type: "decision",
      prompt: { fil: "Paano mo tutulungan si Lapu-Lapu?", en: "How will you help Lapu-Lapu?" },
      timeLimitMs: 8000,
      defaultChoiceId: "reef",
      choices: [
        {
          id: "reef",
          label: { fil: "Ituro ang mababaw na bahura", en: "Show them the shallow reef" },
          response: {
            fil: "Ituro mo sa amin ang daan nila.",
            en: "Show us the road they must take.",
          },
          routeTo: "mactan_defense",
        },
        {
          id: "warn",
          label: { fil: "Ilikas si Amihan at ang mga bata", en: "Get Amihan and the children to safety" },
          response: {
            fil: "Mabuti. Walang batang masasaktan ngayon.",
            en: "Good. No child will be hurt today.",
          },
          routeTo: "mactan_defense",
        },
        {
          id: "spears",
          label: { fil: "Ihanda ang mga sibat sa dalampasigan", en: "Ready the spears on the shore" },
          response: { fil: "Maghanda. Malapit na sila.", en: "Get ready. They are close." },
          routeTo: "mactan_defense",
        },
      ],
    },

    // M10 — mini-game
    {
      id: "mac_minigame",
      type: "minigame",
      key: "mactan_defense",
      title: { fil: "Depensa sa Mactan", en: "Defense of Mactan" },
    },

    // M11 — the tide turns
    {
      id: "mac_s6a",
      type: "story",
      text: {
        fil:
          "Nangyari ang sinabi ni Lapu-Lapu.\n" +
          "Sumadsad ang malalaking bangka sa bato.",
        en:
          "What Lapu-Lapu said came true.\n" +
          "The big boats struck the coral.",
      },
    },
    {
      id: "mac_s6b",
      type: "story",
      text: {
        fil:
          "Kinailangang lumusong ng mga kawal —\n" +
          "mabigat ang baluti, malalim ang putik.\n" +
          "Ang kanilang kanyon ay masyadong malayo para makatulong.\n" +
          "Mabagal sila. Kayo ay hindi.",
        en:
          "The soldiers had to wade in —\n" +
          "heavy armour, deep mud.\n" +
          "Their cannons were too far away to help.\n" +
          "They were slow. You were not.",
      },
    },

    // M12 — aftermath
    {
      id: "mac_s7a",
      type: "story",
      text: {
        fil:
          "Hindi nakalapag ang mga dayuhan.\n" +
          "Sa mababaw na tubig ng Mactan, natalo ang kanilang hukbo.\n" +
          "Doon din nasawi si Magellan.",
        en:
          "The strangers never landed.\n" +
          "In the shallow water of Mactan their force was beaten.\n" +
          "Magellan fell there too.",
      },
    },
    {
      id: "mac_s7b",
      type: "story",
      text: {
        fil:
          "Si Lapu-Lapu ang naging unang pinunong Pilipino\n" +
          "na matagumpay na lumaban sa mga dayuhang mananakop.\n" +
          "Kakaunti lang ang mga nakababang kalaban —\n" +
          "higit silang marami, at kilala nila ang sariling dagat.",
        en:
          "Lapu-Lapu became the first Filipino leader\n" +
          "to successfully resist foreign invaders.\n" +
          "Only a few invaders made it ashore —\n" +
          "they were far more in number, and knew their own sea.",
      },
    },
    {
      id: "mac_s7c",
      type: "story",
      text: {
        fil:
          "At ikaw, ang batang kabisado ang bahura,\n" +
          "naroon ka.",
        en:
          "And you, the child who knew the reef,\n" +
          "you were there.",
      },
    },

    // Fact vs. story, right before the post-test
    {
      id: "mac_dyk",
      type: "didyouknow",
      real: [
        {
          fil: "Naganap ang Labanan sa Mactan noong Abril 27, 1521, at doon nasawi si Magellan.",
          en: "The Battle of Mactan happened on 27 April 1521, and Magellan died there.",
        },
        {
          fil: "Hindi nakalapit ang malalaking barko dahil mababaw ang tubig at may bahura — kaya kinailangan nilang maglakad sa dagat.",
          en: "The big ships could not come close because the water was shallow and full of coral — so the men had to wade ashore.",
        },
        {
          fil: "Kakaunti lang ang mga kawal ni Magellan na nakababa — kaya higit na marami ang mga mandirigma ni Lapu-Lapu laban sa kanila.",
          en: "Only a few of Magellan's soldiers made it ashore — so Lapu-Lapu's warriors greatly outnumbered them.",
        },
        {
          fil: "Totoong pinuno ng Cebu si Rajah Humabon, at nakipagkasundo siya sa mga dayuhan.",
          en: "Rajah Humabon was a real leader of Cebu, and he did make peace with the strangers.",
        },
      ],
      invented: [
        {
          fil: "Ang batang mandaragat na ginagampanan mo — likha siya para sa kuwentong ito.",
          en: "The young seafarer you play — they were created for this story.",
        },
        {
          fil: "Si Amihan, ang iyong nakababatang kapatid.",
          en: "Amihan, your younger sibling.",
        },
        {
          fil: "Ang mga usapan sa laro. Walang naitalang mismong salita nina Lapu-Lapu at Magellan.",
          en: "The conversations in the game. No exact words of Lapu-Lapu or Magellan were ever written down.",
        },
      ],
    },
  ],
};
