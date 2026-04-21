V2 north star
V2 is complete when a run feels like:


not just “Guard hero” or “Ailment hero”


but “I built a machine with producers, consumers, converters, stabilizers, and payoffs”


That matches your thesis exactly: heroes define identity, abilities express it, states carry it, traits shape it, triggers connect it, and rewards deliver it .
What V2 is really about
V2 should prove these 4 things:


Shared trigger grammar exists


Combat states behave like real build resources, not just labels


Rewards push engine coherence, not only lane flavor


Encounters actually test those engines


If those 4 are true, V2 succeeded.
V2 roadmap
V2-M1 — Trigger foundation
Goal: make current live interactions go through a small typed trigger seam without changing gameplay.
This comes first because Codex already found the real risk: trigger logic is split between RunScene, AbilityResolver, and TraitRuntime, so adding richer interactions now would create brittle duplication .
What belongs here:


consolidate current live trigger points only


on-hit


on-kill


on-consume/signature payoff


while-condition checks where needed


add tests that prove behavior is unchanged


Done when:


current gameplay feels the same


tests pass


future trigger additions have one clean place to hook into


This is the “do not be clever” milestone.

V2-M2 — State transaction layer
Goal: make combat states return structured outcomes instead of loose booleans and scattered ad hoc logic.
Your design says the combat-state layer must be a real shared language where states can be applied, consumed, amplified, resisted, or transformed . Right now the repo has some of that, but Codex correctly noted that most current states are still fairly thin, with only Guard really behaving as a richer numeric system .
What belongs here:


structured apply/refresh/consume outcomes


explicit value payloads where needed


no new state family yet


current Guard / Mark / Disrupted / Ailment stay the core V2 testbed


Done when:


traits and abilities can react to state transactions cleanly


future producer/consumer logic no longer needs bespoke one-off checks


This is where the system stops treating states as only flavor markers.

V2-M3 — Engine roles pass
Goal: author build parts more explicitly as producer, amplifier, converter, consumer, stabilizer, keystone.
This comes directly from your design. Traits should not be random extra projectiles or flat bonuses. They should shape the machine .
What belongs here:


classify existing and new V2 traits by engine role


make at least a few strong examples in each role


give each current lane more than one route:


production-heavy


burst consume


sustain/stabilize


spread/control




keep content count controlled


Done when:


the player can intentionally build different versions of the same lane


traits feel like engine parts, not mostly passive garnish


This is the milestone where V2 starts becoming visible to players.

V2-M4 — Reward director 2.0
Goal: make 1-of-3 rewards care about engine coherence, not just lane ownership.
Your reward philosophy is one of the strongest parts of your design doc: choices should answer deepen, branch, or stabilize — not “which boring number card do I hate least?” 
What belongs here:


reward bias from hero chassis


reward bias from current engine commitment


reward bias from missing role in current build


keep one stabilizer/escape slot often available


rare offers become more about keystones, converters, consumers, pivots


Done when:


repeated runs show clearer internal logic


builds feel increasingly coherent over time


late picks feel like payoff for prior commitment


This is where V2 becomes trackable from the player side.

V2-M5 — Chassis law pass
Goal: make each hero solve the shared system differently.
Your design is clear that heroes are chassis, not skins, and they should define the starting grammar rather than own every interaction directly .
What belongs here:


one clearer chassis law per hero


one stronger reward bias rule


one stronger favored interaction family


one more distinct late-run identity route


Done when:


same lane on different hero does not feel equivalent


heroes feel different through shared structure, not custom minigames


Important: this is not “add a new hero.” This is “make existing heroes more legible.”

V2-M6 — Encounter response pass
Goal: make enemies and bosses answer engines, not only damage throughput.
Your design explicitly says the world must respond to build style or the complexity feels fake . Codex also flagged that current encounter hooks exist but some are not fully activated yet .
What belongs here:


one anti-ramp pressure case


one anti-turtle pressure case


one case where consumers matter


one case where stabilization matters


use existing encounter path as much as possible


Done when:


engine quality matters in live runs


bad builds are exposed for structural reasons, not just lower DPS


This is the proof milestone. If this part fails, V2 is fake.

V2-M7 — First full V2 slice validation
Goal: prove one complete “engine-style” run path per hero, end to end.
What belongs here:


testable representative builds


repeat-run validation


reward coherence check


pacing/readability cleanup where needed


regression tests


Done when:


each hero has at least one clear V2-style engine route


those routes are understandable, playable, and distinct


the run no longer feels like only stronger V1


This is V2 closure.
Progress tracker structure
Use this structure to track where you are:


M1 Trigger foundation


M2 State transaction layer


M3 Engine role pass


M4 Reward director 2.0


M5 Chassis law pass


M6 Encounter response pass


M7 Full V2 validation


And for each milestone track 4 things:


design complete


implementation complete


playtest complete


validated/stable


That gives you a real “how far are we” view instead of vague feelings.
What is explicitly not V2
To keep me strict as supervisor, these should stay out unless they directly block a milestone:


no new hero


no giant proc engine


no full event framework rewrite


no exploding tag taxonomy


no content flood just to look big


no redesign of the whole runtime spine


no “more weapons = more depth” trap


no hero-specific one-off subsystems that bypass the shared model


That all follows directly from your design warnings .
Recommended order of actual work
The work order should be:
M1 → M2 → M3 → M4 → M6 → M5 → M7
Why that order:


M1 and M2 are technical foundations


M3 and M4 create the actual engine identity


M6 proves the world responds


M5 sharpens hero differentiation after the system is stronger


M7 is validation and closure


I placed M6 before M5 on purpose. If encounters do not test the engine, chassis tuning can lie to you. Better to prove the system first, then sharpen hero identity on top of something real.
Supervisor verdict
So yes — before I judge Codex well, I need this broad map, and now we have it:
V2 = Trigger Grammar + State Economy + Engine-Coherent Rewards + Encounter Proof
using the shared-layer framework from your design doc, not a content explosion .
Next best step is to formalize this into a V2 roadmap document with milestone checkboxes and closure criteria, so every future Codex task gets judged against the same map.