// ─── Topic Pool ─────────────────────────────────────────────────────
export const TOPIC_POOL = [
  'cyberbullying',
  'identity-theft',
  'illegal-access',
  'cyber-libel',
  'data-privacy',
  'online-scams',
  'phishing',
  'computer-related-fraud',
  'prevention-bystander',
];

// ─── RA 10175 Reference Material ────────────────────────────────────
export const RA_10175_REFERENCE = `
Republic Act No. 10175 — Cybercrime Prevention Act of 2012

SECTION 4. CYBERCRIME OFFENSES:

(a) Offenses Against Confidentiality, Integrity, and Availability of Computer Data and Systems:
  (1) Illegal Access — Intentional access to the whole or any part of a computer system without right.
  (3) Data Interference — Intentional or reckless alteration, damaging, deletion, or deterioration of computer data without right.
  (5) Misuse of Devices — Use, production, sale, procurement, importation, distribution, or otherwise making available of devices/passwords/access codes for committing offenses.

(b) Computer-related Offenses:
  (1) Computer-related Forgery — Input, alteration, or deletion of computer data resulting in inauthentic data with the intent that it be considered authentic.
  (2) Computer-related Fraud — Unauthorized input, alteration, or deletion of computer data causing damage; or interference with the functioning of a computer system, causing damage.
  (3) Computer-related Identity Theft — Intentional acquisition, use, misuse, transfer, possession, alteration, or deletion of identifying information of another person without right.

(c) Content-related Offenses:
  (1) Cybersex — Willful engagement, maintenance, control, or operation of any lascivious exhibition of sexual organs or activity, with the aid of a computer system, for favor or consideration.
  (2) Child Pornography — Unlawful or prohibited acts as defined under RA 9775 committed through a computer system.
  (3) Unsolicited Commercial Communications (Spam) — Transmission of commercial electronic communication with the use of computer system which seeks to advertise, sell, or offer for sale products and services, without prior consent or opt-out mechanism.
  (4) Libel (Cyber Libel) — Unlawful or prohibited acts of libel as defined in Article 355 of the Revised Penal Code, committed through a computer system or similar means.

SECTION 5 — Other Offenses:
  Aiding or abetting in the commission of cybercrime and attempt to commit cybercrime are punishable.

SECTION 6 — All crimes defined and penalized by the Revised Penal Code and special laws, if committed by, through, and with the use of ICT, shall be covered by the relevant provisions of this Act. The penalty shall be one degree higher than that provided for by the RPC and other special laws.

ENFORCEMENT BODIES:
  - PNP Anti-Cybercrime Group (ACG)
  - NBI Cybercrime Division
  - Department of Justice — Office of Cybercrime (OOC)
  - National Privacy Commission (NPC) — for Data Privacy Act violations

PENALTIES:
  - Prision mayor (6-12 years) or fine of at least PHP 200,000 up to amount of damage, or both
  - Section 6 offenses carry penalties one degree higher
  - Section 5 (aiding/abetting) carries the same penalty as the principal offense
`.trim();

// ─── Related Philippine Laws ────────────────────────────────────────
export const RELATED_LAWS_REFERENCE = `
Related Philippine Laws:

- RA 10173 (Data Privacy Act of 2012) — Protects individual personal information in information and communications systems. Violations include unauthorized processing, accessing due to negligence, improper disposal, and unauthorized access or intentional breach.

- RA 9995 (Anti-Photo and Video Voyeurism Act of 2009) — Prohibits taking photos/videos of a person's private area without consent, copying/selling such content, and publishing/broadcasting it.

- RA 9262 (Anti-Violence Against Women and Children Act of 2004) — Covers psychological violence through electronic means, online threats, harassment, and stalking against women and children.

- RA 11313 (Safe Spaces Act / Bawal Bastos Law of 2019) — Covers gender-based online sexual harassment including unwanted sexual remarks, threatening or discriminatory posts, uploading non-consensual content, and persistent sending of unwanted messages.
`.trim();

// ─── Presentation Context ───────────────────────────────────────────
// Replace this with actual content from the team's presentation/PPT
export const PRESENTATION_CONTEXT = `No specific presentation content provided. Generate scenarios based on general RA 10175 knowledge and common cybercrime situations relatable to Filipino college students.`;

// ─── Topic Selection Helper ─────────────────────────────────────────
export function pickTopic(previousTopics = []) {
  const available = TOPIC_POOL.filter(t => !previousTopics.includes(t));
  if (available.length === 0) {
    // All topics used — pick any except the very last one used
    const lastUsed = previousTopics[previousTopics.length - 1];
    const pool = TOPIC_POOL.filter(t => t !== lastUsed);
    return pool[Math.floor(Math.random() * pool.length)];
  }
  return available[Math.floor(Math.random() * available.length)];
}
