import type { ArcContent } from "./types";

/**
 * Pugad Lawin arc (Andres Bonifacio, 1896).
 * The pupil is a fictional ally — a young Katipunero — not Bonifacio himself.
 *
 * All learner-facing text is authored in BOTH languages (fil = Filipino,
 * en = English) per DepEd Order No. 20, s. 2025. Keep the two in sync when
 * editing: the English is a translation for comprehension, not a new story.
 */
export const pugadLawinArc: ArcContent = {
  arc: "pugad_lawin",
  title: { fil: "Sigaw sa Pugad Lawin", en: "The Cry of Pugad Lawin" },
  assessment: {
    objectives: [
      {
        id: "pl_obj_leader",
        description: {
          fil: "Nakikilala ang pinuno ng Katipunan.",
          en: "Identifies the leader of the Katipunan.",
        },
        items: [
          {
            id: "pl_leader_a",
            question: {
              fil: "Sino ang pinuno ng Katipunan sa Sigaw sa Pugad Lawin?",
              en: "Who led the Katipunan at the Cry of Pugad Lawin?",
            },
            choices: [
              { id: "a", label: { fil: "Andres Bonifacio", en: "Andres Bonifacio" } },
              { id: "b", label: { fil: "Jose Rizal", en: "Jose Rizal" } },
              { id: "c", label: { fil: "Emilio Aguinaldo", en: "Emilio Aguinaldo" } },
              { id: "d", label: { fil: "Lapu-Lapu", en: "Lapu-Lapu" } },
            ],
            correctChoiceId: "a",
          },
          {
            id: "pl_leader_b",
            question: {
              fil: "Sinong pinuno ang nanguna sa mga Katipunero noong 1896?",
              en: "Which leader led the Katipuneros in 1896?",
            },
            choices: [
              { id: "a", label: { fil: "Apolinario Mabini", en: "Apolinario Mabini" } },
              { id: "b", label: { fil: "Andres Bonifacio", en: "Andres Bonifacio" } },
              { id: "c", label: { fil: "Marcelo del Pilar", en: "Marcelo del Pilar" } },
              { id: "d", label: { fil: "Rajah Humabon", en: "Rajah Humabon" } },
            ],
            correctChoiceId: "b",
          },
        ],
      },
      {
        id: "pl_obj_cedula",
        description: {
          fil: "Nauunawaan ang pagpunit ng cedula bilang simbolo ng paghihimagsik.",
          en: "Understands the tearing of the cedula as a symbol of revolt.",
        },
        items: [
          {
            id: "pl_cedula_a",
            question: {
              fil: "Ano ang ginawa ng mga Katipunero bilang tanda ng paghihimagsik?",
              en: "What did the Katipuneros do as a sign of revolt?",
            },
            choices: [
              { id: "a", label: { fil: "Sinunog ang bandila", en: "Burned the flag" } },
              { id: "b", label: { fil: "Pinunit ang kanilang cedula", en: "Tore up their cedulas" } },
              { id: "c", label: { fil: "Nagtanim ng puno", en: "Planted a tree" } },
              { id: "d", label: { fil: "Sumulat ng liham sa hari", en: "Wrote a letter to the king" } },
            ],
            correctChoiceId: "b",
          },
          {
            id: "pl_cedula_b",
            question: {
              fil: "Ano ang cedula na pinunit ng mga Katipunero?",
              en: "What was the cedula that the Katipuneros tore up?",
            },
            choices: [
              { id: "a", label: { fil: "Isang mapa ng Maynila", en: "A map of Manila" } },
              { id: "b", label: { fil: "Isang sulat mula kay Rizal", en: "A letter from Rizal" } },
              { id: "c", label: { fil: "Ang patunay ng pagsunod sa Espanya", en: "The proof of submission to Spain" } },
              { id: "d", label: { fil: "Ang bandila ng Katipunan", en: "The flag of the Katipunan" } },
            ],
            correctChoiceId: "c",
          },
        ],
      },
      {
        id: "pl_obj_year",
        description: {
          fil: "Natutukoy ang taon ng pagsisimula ng himagsikan.",
          en: "Identifies the year the revolution began.",
        },
        items: [
          {
            id: "pl_year_a",
            question: {
              fil: "Anong taon naganap ang Sigaw sa Pugad Lawin?",
              en: "In what year did the Cry of Pugad Lawin happen?",
            },
            choices: [
              { id: "a", label: { fil: "1521", en: "1521" } },
              { id: "b", label: { fil: "1872", en: "1872" } },
              { id: "c", label: { fil: "1896", en: "1896" } },
              { id: "d", label: { fil: "1946", en: "1946" } },
            ],
            correctChoiceId: "c",
          },
          {
            id: "pl_year_b",
            question: {
              fil: "Kailan nagsimula ang himagsikan ng mga Katipunero laban sa Espanya?",
              en: "When did the Katipuneros' revolution against Spain begin?",
            },
            choices: [
              { id: "a", label: { fil: "Noong 1896", en: "In 1896" } },
              { id: "b", label: { fil: "Noong 1521", en: "In 1521" } },
              { id: "c", label: { fil: "Noong 1898", en: "In 1898" } },
              { id: "d", label: { fil: "Noong 1935", en: "In 1935" } },
            ],
            correctChoiceId: "a",
          },
        ],
      },
    ],
  },

  nodes: [
    {
      id: "pl_title",
      type: "titlecard",
      place: { fil: "Pugad Lawin", en: "Pugad Lawin" },
      year: "1896",
    },

    // P1 — hook
    {
      id: "pl_s1",
      type: "story",
      text: {
        fil:
          "Hatinggabi nang may kumatok.\n" +
          "Hindi kaibigan. Hindi kalaban. Isang bulong.\n" +
          "“Natuklasan na nila ang Katipunan.”\n" +
          "Tumigil ang iyong paghinga.",
        en:
          "It was midnight when a knock came.\n" +
          "Not a friend. Not an enemy. A whisper.\n" +
          "“They have discovered the Katipunan.”\n" +
          "Your breath stopped.",
      },
    },

    // P2 — the ally (you)
    {
      id: "pl_char_you",
      type: "character",
      name: { fil: "Ikaw", en: "You" },
      role: { fil: "Batang tagapaghatid ng Katipunan", en: "A young messenger of the Katipunan" },
      historicity: "fictional",
      image: "pugad_lawin/char_ally",
      lines: [
        {
          fil: "Bata ka pa, kaya walang guwardiyang naghihinala sa iyo.",
          en: "You are only a child, so no guard suspects you.",
        },
        {
          fil: "Nakakalusot ka sa makikitid na eskinita ng Maynila.",
          en: "You slip through the narrow alleys of Manila.",
        },
        {
          fil: "May dala kang mga salitang lihim — hindi kayang dalhin ninuman.",
          en: "You carry secret words — words no one else can carry.",
        },
      ],
    },

    // P3 — what the Katipunan is
    {
      id: "pl_s2",
      type: "story",
      text: {
        fil:
          "Ano ang Katipunan?\n" +
          "Isang lihim na kapatiran ng mga karaniwang Pilipino.\n" +
          "Magsasaka, manggagawa, guro, bata — nagkaisa para sa iisang pangarap:\n" +
          "kalayaan mula sa mga Espanyol.",
        en:
          "What is the Katipunan?\n" +
          "A secret brotherhood of ordinary Filipinos.\n" +
          "Farmers, workers, teachers, children — united by one dream:\n" +
          "freedom from Spanish rule.",
      },
    },

    // P4 — Bonifacio
    {
      id: "pl_char_bonifacio",
      type: "character",
      name: { fil: "Andres Bonifacio", en: "Andres Bonifacio" },
      role: { fil: "Ang Supremo ng Katipunan", en: "The Supremo of the Katipunan" },
      historicity: "real",
      image: "pugad_lawin/char_bonifacio",
      lines: [
        {
          fil: "Hindi siya mayaman. Taga-Tondo, nagtatrabaho, at nag-aral mag-isa sa pagbabasa.",
          en: "He was not rich. A worker from Tondo who taught himself by reading.",
        },
        {
          fil: "Layunin niya: kalayaan para sa bawat Pilipino, kahit sa pinakamahirap.",
          en: "His goal: freedom for every Filipino, even the poorest.",
        },
        {
          fil: "“Kung hindi tayo kikilos ngayon,” tanong niya, “kailan pa?”",
          en: "“If we do not act now,” he asked, “then when?”",
        },
      ],
    },

    // P5 — discovered
    {
      id: "pl_s3",
      type: "story",
      text: {
        fil:
          "Ngunit may nagsalita nang hindi dapat.\n" +
          "Nalaman ng mga Espanyol ang tungkol sa Katipunan.\n" +
          "Ngayon, hinahanap na nila ang mga kasapi. Delikado nang magtago.\n" +
          "Kailangang magpasya — ngayon na.",
        en:
          "But someone spoke who should not have.\n" +
          "The Spanish learned about the Katipunan.\n" +
          "Now they are hunting its members. Hiding is no longer safe.\n" +
          "A choice had to be made — now.",
      },
    },

    // P6 — Jacinto
    {
      id: "pl_char_jacinto",
      type: "character",
      name: { fil: "Emilio Jacinto", en: "Emilio Jacinto" },
      role: { fil: "Ang Utak ng Katipunan", en: "The Brain of the Katipunan" },
      historicity: "real",
      image: "pugad_lawin/char_jacinto",
      lines: [
        {
          fil: "Dalawampung taong gulang pa lamang siya — bata, ngunit matalino.",
          en: "He was only twenty years old — young, but brilliant.",
        },
        {
          fil: "Siya ang sumulat ng Kartilya, ang gabay ng mga Katipunero.",
          en: "He wrote the Kartilya, the guide of the Katipuneros.",
        },
        {
          fil: "“Ituturo ko sa iyo ang lihim na code,” sabi niya sa iyo.",
          en: "“I will teach you the secret code,” he told you.",
        },
      ],
    },

    // P7 — code mini-game
    {
      id: "pl_minigame_code",
      type: "minigame",
      key: "code_unscramble",
      title: { fil: "Lihim na Code", en: "The Secret Code" },
    },

    // P8 — spread the word (personal stake woven in)
    {
      id: "pl_s4",
      type: "story",
      text: {
        fil:
          "Nabasa mo ang lihim na mensahe: magtitipon sa Pugad Lawin.\n" +
          "Ngunit kakaunti pa ang nakakaalam.\n" +
          "“Kailangan natin ng mas marami,” sabi ni Jacinto.\n" +
          "Kabilang sa kanila ang iyong mga kaibigan at kapitbahay. Hikayatin mo sila — dahan-dahan, at ligtas.",
        en:
          "You read the secret message: gather at Pugad Lawin.\n" +
          "But too few knew yet.\n" +
          "“We need more of us,” said Jacinto.\n" +
          "Among them are your own friends and neighbours. Win them over — carefully, and safely.",
      },
    },

    // P9 — recruit mini-game
    {
      id: "pl_minigame_recruit",
      type: "minigame",
      key: "katipunan_recruit",
      title: { fil: "Pangangalap ng Katipunero", en: "Recruiting Katipuneros" },
    },

    // P10 — the gathering
    {
      id: "pl_s5",
      type: "story",
      text: {
        fil:
          "Sa Pugad Lawin, nagtipon ang daan-daang Katipunero.\n" +
          "Tumindig si Bonifacio sa harap nila.\n" +
          "Sa kamay niya, hawak ang cedula — ang patunay ng pagsunod sa Espanya.\n" +
          "Tumingin siya sa iyo. “Kapatid, handa ka na ba?”",
        en:
          "At Pugad Lawin, hundreds of Katipuneros gathered.\n" +
          "Bonifacio stood before them.\n" +
          "In his hand, a cedula — the proof of submission to Spain.\n" +
          "He looked at you. “Brother, are you ready?”",
      },
    },

    // P11 — decision
    {
      id: "pl_decision_cedula",
      type: "decision",
      prompt: { fil: "Ano ang gagawin mo sa iyong cedula?", en: "What will you do with your cedula?" },
      timeLimitMs: 8000,
      defaultChoiceId: "tear",
      choices: [
        {
          id: "tear",
          label: { fil: "Punitin ang cedula!", en: "Tear the cedula!" },
          response: { fil: "Kasama ka namin, kapatid.", en: "You are with us, brother." },
          routeTo: "cedula_tear",
        },
        {
          id: "hold",
          label: { fil: "Hawakan nang mahigpit", en: "Hold it tightly" },
          response: {
            fil: "Ramdam ko ang iyong takot. Tayo\u2019y magkakasama.",
            en: "I feel your fear. We are together.",
          },
          routeTo: "cedula_tear",
        },
      ],
    },

    // P12 — cedula mini-game (climax)
    {
      id: "pl_minigame_cedula",
      type: "minigame",
      key: "cedula_tear",
      title: { fil: "Punitin ang Cedula", en: "Tear the Cedula" },
    },

    // P13 — the Cry
    {
      id: "pl_s6",
      type: "story",
      text: {
        fil:
          "“Mabuhay ang Pilipinas!”\n" +
          "Sabay-sabay na pinunit ng mga Katipunero ang kanilang cedula.\n" +
          "Umalingawngaw ang sigaw sa buong Pugad Lawin.\n" +
          "Nagsimula na ang himagsikan — at bahagi ka nito.",
        en:
          "“Long live the Philippines!”\n" +
          "Together the Katipuneros tore their cedulas.\n" +
          "The cry echoed across all of Pugad Lawin.\n" +
          "The revolution had begun — and you were part of it.",
      },
    },

    // P14 — what it meant
    {
      id: "pl_s7",
      type: "story",
      text: {
        fil:
          "Hindi hukbo ang nagsimula ng himagsikan.\n" +
          "Mga karaniwang tao — magsasaka, manggagawa, bata — na piniling lumaban.\n" +
          "Hindi dahil malakas sila, kundi dahil matapang.\n" +
          "At ikaw, ang batang tagapaghatid, naroon ka.",
        en:
          "It was not an army that began the revolution.\n" +
          "Ordinary people — farmers, workers, children — who chose to fight.\n" +
          "Not because they were strong, but because they were brave.\n" +
          "And you, the young messenger, you were there.",
      },
    },

    // Fact vs. story + the honest controversy note
    {
      id: "pl_dyk",
      type: "didyouknow",
      real: [
        {
          fil: "Si Andres Bonifacio ang pinuno ng Katipunan, isang lihim na kapatiran para sa kalayaan.",
          en: "Andres Bonifacio led the Katipunan, a secret brotherhood for freedom.",
        },
        {
          fil: "Gumamit ang mga Katipunero ng mga lihim na code at password para hindi sila matuklasan.",
          en: "The Katipuneros used secret codes and passwords so they would not be discovered.",
        },
        {
          fil: "Pinunit ng mga Katipunero ang kanilang cedula bilang pagtanggi sa pananakop ng Espanya, noong Agosto 1896.",
          en: "The Katipuneros tore their cedulas to reject Spanish rule, in August 1896.",
        },
      ],
      invented: [
        {
          fil: "Ang batang tagapaghatid na ginagampanan mo — likha siya para sa kuwentong ito.",
          en: "The young messenger you play — they were created for this story.",
        },
        {
          fil: "Ang mismong mga usapan sa laro. Totoo ang diwa, ngunit hindi ito ang eksaktong mga salita.",
          en: "The exact conversations in the game. The spirit is real, but these were not the exact words.",
        },
      ],
      note: {
        fil: "May mga istoryador na hindi pa lubusang magkasundo kung saan at kailan eksakto naganap ang Sigaw — sa Pugad Lawin o sa Balintawak. Ganito nga ang kasaysayan: patuloy itong pinag-aaralan.",
        en: "Historians do not fully agree on exactly where and when the Cry happened — at Pugad Lawin or Balintawak. That is how history works: it keeps being studied.",
      },
    },
  ],
};
