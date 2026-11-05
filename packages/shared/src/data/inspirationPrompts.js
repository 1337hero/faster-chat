// Curated inspiration prompt library. Pure static data — the frontend imports it
// directly, so browsing costs no network calls and no tokens.
//
// Entry shape: { id, prompt, style, category, source }
// source: "awesome-gpt-image-2" (community-curated generation prompts),
//        "hand-drawn" (hand-drawn style cases), "curated" (hand-picked for breadth)
export const INSPIRATION_PROMPTS = [
  // Photorealistic
  {
    id: "ip-001",
    prompt:
      "35mm film photograph of a weathered fisherman mending a net at golden hour, 85mm f/1.4 lens, shallow depth of field, warm amber light, muted teal shadows, grain texture",
    style: "cinematic photography",
    category: "photorealistic",
    source: "curated",
  },
  {
    id: "ip-002",
    prompt:
      "Macro photograph of a dew-covered spiderweb at dawn, 100mm macro lens, soft diffused morning light, cool blue and gold palette, intricate detail in the droplets",
    style: "macro photography",
    category: "photorealistic",
    source: "awesome-gpt-image-2",
  },
  {
    id: "ip-003",
    prompt:
      "Street photograph of a rainy neon-lit alley, long exposure, wet asphalt reflections, magenta and cyan neon signs, silhouetted pedestrian with a transparent umbrella",
    style: "urban photography",
    category: "photorealistic",
    source: "curated",
  },
  {
    id: "ip-004",
    prompt:
      "Food photography of a rustic sourdough loaf on a linen cloth, single soft window light from the left, warm cream and brown palette, flour dust in the air, 50mm lens",
    style: "still life",
    category: "photorealistic",
    source: "awesome-gpt-image-2",
  },
  {
    id: "ip-005",
    prompt:
      "Portrait of an elderly clockmaker in his workshop, Rembrandt lighting, warm tungsten key light, brass and wood tones, 85mm f/2, shallow focus on weathered hands holding tweezers",
    style: "portrait photography",
    category: "photorealistic",
    source: "curated",
  },
  {
    id: "ip-006",
    prompt:
      "Aerial photograph of terraced rice paddies at sunrise, soft mist over the fields, layered emerald and gold palette, low sun casting long shadows across the terraces",
    style: "aerial photography",
    category: "photorealistic",
    source: "curated",
  },
  {
    id: "ip-007",
    prompt:
      "High-speed photograph of a shattering glass bowl frozen mid-air, 1/8000s shutter, single hard studio flash on a black backdrop, sharp shards catching white light",
    style: "high-speed photography",
    category: "photorealistic",
    source: "awesome-gpt-image-2",
  },
  {
    id: "ip-008",
    prompt:
      "Underwater photograph of a scuba diver beside a school of silver fish, shafts of light from the surface, deep teal and cyan palette, fine particulate in the water",
    style: "underwater photography",
    category: "photorealistic",
    source: "curated",
  },
  {
    id: "ip-009",
    prompt:
      "Documentary photograph of a night market food stall, 35mm lens, available light from charcoal smoke and paper lanterns, orange and deep red palette, steam and motion blur in the chef's arms",
    style: "documentary photography",
    category: "photorealistic",
    source: "curated",
  },
  {
    id: "ip-010",
    prompt:
      "Double exposure of a pine forest and a starry night sky, silhouette of a lone hiker on a ridge, deep indigo and forest green palette, long-exposure star trails, film grain",
    style: "creative photography",
    category: "photorealistic",
    source: "awesome-gpt-image-2",
  },

  // Anime & Manga
  {
    id: "ip-011",
    prompt:
      "Anime key visual of a girl with a paper bag over her head running through a sunset street, Studio Ghibli inspired, soft cel shading, warm orange and pink sky, gentle wind in the trees",
    style: "anime",
    category: "anime",
    source: "curated",
  },
  {
    id: "ip-012",
    prompt:
      "Manga panel of a swordsman's slow turn, black ink with screentone shading, dramatic low angle, speed lines radiating from the blade, high contrast",
    style: "manga ink",
    category: "anime",
    source: "curated",
  },
  {
    id: "ip-013",
    prompt:
      "Anime still of a train station platform in the rain, blue hour palette, warm yellow platform lights, a couple sharing one umbrella, soft bokeh, Makoto Shinkai style clouds",
    style: "anime",
    category: "anime",
    source: "awesome-gpt-image-2",
  },
  {
    id: "ip-014",
    prompt:
      "Retro 90s anime aesthetic, a mecha pilot in a cockpit, flat cel colors, VHS scanlines, neon green HUD glow on the face, VHS tape label in the corner reading \"MECHA LOG 7\"",
    style: "retro anime",
    category: "anime",
    source: "curated",
  },
  {
    id: "ip-015",
    prompt:
      "Chibi characters of a four-person cooking club in a kitchen, big heads, simple line art, warm pastel palette, steam and sparkle effects, sticker-style white outlines",
    style: "chibi",
    category: "anime",
    source: "awesome-gpt-image-2",
  },
  {
    id: "ip-016",
    prompt:
      "Dark fantasy anime still of a knight kneeling in a ruined cathedral, shafts of cold moonlight, deep blue and grey palette, embers floating, intricate armor engravings",
    style: "anime",
    category: "anime",
    source: "curated",
  },
  {
    id: "ip-017",
    prompt:
      "Watercolor-look anime illustration of a summer festival at night, fireworks in soft bleed, pink and violet palette, paper texture, lantern-lit crowd",
    style: "anime illustration",
    category: "anime",
    source: "curated",
  },
  {
    id: "ip-018",
    prompt:
      "Anime opening scene of a mountain biker mid-air over a cliff, dynamic motion lines, saturated green and blue palette, cel-shaded clouds, sense of speed",
    style: "anime",
    category: "anime",
    source: "awesome-gpt-image-2",
  },
  {
    id: "ip-019",
    prompt:
      "Cyberpunk anime still of a noodle shop in a vertical city, dense neon signage in Japanese, rain-streaked windows, cyan and hot pink palette, steam rising from the counter",
    style: "anime cyberpunk",
    category: "anime",
    source: "curated",
  },
  {
    id: "ip-020",
    prompt:
      "Ghibli-style countryside: a small train passing a wheat field, a dog running alongside the track, golden afternoon light, lush green hills, hand-painted sky with drifting clouds",
    style: "anime",
    category: "anime",
    source: "awesome-gpt-image-2",
  },

  // Digital Concept Art
  {
    id: "ip-021",
    prompt:
      "Digital concept art of a floating sky island city, layered waterfalls pouring off the edge, warm volumetric light, painterly brushwork, teal and amber palette",
    style: "painterly concept art",
    category: "concept-art",
    source: "curated",
  },
  {
    id: "ip-022",
    prompt:
      "Character concept sheet of a desert nomad, front and side views, layered silk and leather materials, ochre and sand palette, clean line work with soft digital painting",
    style: "character design",
    category: "concept-art",
    source: "curated",
  },
  {
    id: "ip-023",
    prompt:
      "Environment concept art of a bioluminescent underwater research station, glowing blue flora, warm interior lights, soft fog, cinematic wide composition",
    style: "environment design",
    category: "concept-art",
    source: "awesome-gpt-image-2",
  },
  {
    id: "ip-024",
    prompt:
      "Mechanical concept art of a steam-driven exoskeleton suit, brushed copper and iron materials, rivets and piping detail, workshop clutter in the background, warm gaslight",
    style: "mechanical design",
    category: "concept-art",
    source: "curated",
  },
  {
    id: "ip-025",
    prompt:
      "Painterly concept art of a dragon coiled around a mountain monastery at dusk, dramatic scale, mist and birds, red and slate palette, loose brushstrokes",
    style: "painterly concept art",
    category: "concept-art",
    source: "curated",
  },
  {
    id: "ip-026",
    prompt:
      "Prop concept art of a worn leather satchel, top-down view on a workbench, stitching and patina detail, soft studio light, neutral grey background",
    style: "prop design",
    category: "concept-art",
    source: "awesome-gpt-image-2",
  },
  {
    id: "ip-027",
    prompt:
      "Sci-fi environment concept of a terraformed Mars greenhouse, curved glass panels, red rock outside, lush green inside, soft diffused daylight, clean render style",
    style: "environment design",
    category: "concept-art",
    source: "curated",
  },
  {
    id: "ip-028",
    prompt:
      "Character concept of a deep-sea diver in a brass bell helmet, weathered metal and rubber, bioluminescent fish in the background, teal and bronze palette",
    style: "character design",
    category: "concept-art",
    source: "awesome-gpt-image-2",
  },
  {
    id: "ip-029",
    prompt:
      "Mood board style composition of a post-apocalyptic diner, overgrown with ivy, faded neon sign reading \"OPEN\", dusty interior, god rays through broken windows, muted olive and rust palette",
    style: "painterly concept art",
    category: "concept-art",
    source: "curated",
  },
  {
    id: "ip-030",
    prompt:
      "Vehicle concept art of a solar-sailed cargo ship in orbit, thin reflective wings catching starlight, deep space backdrop, clean white-on-dark rendering",
    style: "vehicle design",
    category: "concept-art",
    source: "curated",
  },

  // 3D Render
  {
    id: "ip-031",
    prompt:
      "Stylized 3D render of a tiny astronaut planting a glowing tree on a red planet, soft global illumination, pastel palette, clean topology, Octane-style lighting",
    style: "stylized 3D",
    category: "3d-render",
    source: "curated",
  },
  {
    id: "ip-032",
    prompt:
      "Product render of a matte black wireless headphone on a pedestal, studio three-point lighting, soft shadows, dark charcoal background, subtle rim light",
    style: "product render",
    category: "3d-render",
    source: "curated",
  },
  {
    id: "ip-033",
    prompt:
      "Low-poly 3D scene of a cozy mountain cabin at night, flat shading, snow, warm window glow, deep blue night sky, soft fog",
    style: "low-poly",
    category: "3d-render",
    source: "awesome-gpt-image-2",
  },
  {
    id: "ip-034",
      prompt:
      "Clay render of a baroque church interior, untextured grey clay material, dramatic window light, long shadows, architectural depth",
    style: "clay render",
    category: "3d-render",
    source: "curated",
  },
  {
    id: "ip-035",
    prompt:
      "3D character render of a friendly robot barista pouring coffee, glossy white and orange materials, soft studio lighting, shallow depth of field, clean background",
    style: "character render",
    category: "3d-render",
    source: "curated",
  },
  {
    id: "ip-036",
    prompt:
      "Volumetric 3D render of a foggy pine forest at night, a single lantern in the distance, god rays through the mist, monochrome green and grey palette",
    style: "stylized 3D",
    category: "3d-render",
    source: "awesome-gpt-image-2",
  },
  {
    id: "ip-037",
    prompt:
      "Abstract 3D render of flowing liquid metal ribbons, chrome material, iridescent reflections, dark studio backdrop, dramatic lighting",
    style: "abstract 3D",
    category: "3d-render",
    source: "curated",
  },
  {
    id: "ip-038",
    prompt:
      "Isometric 3D render of a small smart home interior, cutaway walls, warm interior lighting, flat colors, clean lines, soft ambient occlusion",
    style: "isometric 3D",
    category: "3d-render",
    source: "curated",
  },
  {
    id: "ip-039",
    prompt:
      "Subsurface-scattering 3D render of a translucent jellyfish drifting in deep water, blue bioluminescent glow, caustic light, dark ocean backdrop",
    style: "stylized 3D",
    category: "3d-render",
    source: "awesome-gpt-image-2",
  },
  {
    id: "ip-040",
    prompt:
      "Stylized 3D diorama of a rainy Tokyo side street at night, tiny cars, neon signs in Japanese, wet asphalt reflections, diorama base with soft vignette",
    style: "diorama",
    category: "3d-render",
    source: "curated",
  },

  // Watercolor & Illustration
  {
    id: "ip-041",
    prompt:
      "Loose watercolor illustration of a fox sleeping in a field of sunflowers, wet-on-wet washes, soft yellow and orange palette, visible paper grain, minimal line work",
    style: "watercolor",
    category: "watercolor",
    source: "curated",
  },
  {
    id: "ip-042",
    prompt:
      "Children's book illustration of a night kitchen where a raccoon bakes cookies, warm candlelight, soft gouache texture, round friendly shapes, deep blue and honey palette",
    style: "children's illustration",
    category: "watercolor",
    source: "curated",
  },
  {
    id: "ip-043",
    prompt:
      "Botanical watercolor of a single monstera leaf, precise veining, translucent pigment layers, white paper background, one brush of gold leaf on the stem",
    style: "botanical watercolor",
    category: "watercolor",
    source: "awesome-gpt-image-2",
  },
  {
    id: "ip-044",
    prompt:
      "Watercolor landscape of a lighthouse on a cliff in a storm, dramatic wet brush strokes, slate blue and white palette, salt spray texture, one splash of red on the lantern",
    style: "watercolor",
    category: "watercolor",
    source: "curated",
  },
  {
    id: "ip-045",
    prompt:
      "Ink and watercolor illustration of a bookshop cat wearing reading glasses, loose ink outline, watercolor wash, warm cream paper, small red bow tie",
    style: "ink and wash",
    category: "watercolor",
    source: "curated",
  },
  {
    id: "ip-046",
    prompt:
      "Gouache illustration of a vintage car in a field of lavender, flat color blocks, subtle texture, soft purple and teal palette, clean edges, mid-century style",
    style: "gouache illustration",
    category: "watercolor",
    source: "awesome-gpt-image-2",
  },
  {
    id: "ip-047",
    prompt:
      "Delicate watercolor of a heron taking off from a still pond, monochrome ink lines with a wash of grey and one stroke of vermilion on the leg, lots of negative space",
    style: "watercolor",
    category: "watercolor",
    source: "curated",
  },
  {
    id: "ip-048",
    prompt:
      "Storybook illustration of a train crossing a wooden bridge over a river of clouds, soft pencil sketch under watercolor, warm morning palette, gentle rounded forms",
    style: "children's illustration",
    category: "watercolor",
    source: "curated",
  },
  {
    id: "ip-049",
    prompt:
      "Watercolor study of a mountain range in fog, layered washes from dark ink to pale blue, minimal detail, one small red bridge in the mid-ground",
    style: "watercolor",
    category: "watercolor",
    source: "awesome-gpt-image-2",
  },
  {
    id: "ip-050",
    prompt:
      "Hand-drawn watercolor of a tea ceremony, steam rendered as loose brush spirals, celadon green and warm wood palette, textured paper, quiet composition",
    style: "watercolor",
    category: "watercolor",
    source: "hand-drawn",
  },

  // Cyberpunk & Sci-Fi
  {
    id: "ip-051",
    prompt:
      "Cyberpunk street scene at night, dense vertical neon signage in Japanese, rain, a vendor's food cart with steam, cyan and magenta palette, reflective wet pavement",
    style: "cyberpunk",
    category: "cyberpunk",
    source: "curated",
  },
  {
    id: "ip-052",
    prompt:
      "Portrait of a android with cracked porcelain face, single green optical sensor, rim light from a neon sign reading \"AI\", dark background, cinematic close-up",
    style: "sci-fi portrait",
    category: "cyberpunk",
    source: "curated",
  },
  {
    id: "ip-053",
    prompt:
      "Retro-futuristic spaceport terminal, 1960s chrome and brushed metal, families waiting with robot luggage, warm tungsten lighting, clean lines, vintage sci-fi poster feel",
    style: "retro-futurism",
    category: "cyberpunk",
    source: "awesome-gpt-image-2",
  },
  {
    id: "ip-054",
    prompt:
      "Interior of a spaceship bridge, holographic star charts in blue, worn control surfaces, one window showing a nebula, moody cinematic lighting, teal and orange palette",
    style: "sci-fi environment",
    category: "cyberpunk",
    source: "curated",
  },
  {
    id: "ip-055",
    prompt:
      "Solarpunk city on a hillside, vertical gardens and solar canopies, people on bike paths, warm afternoon light, lush green and copper palette, optimistic mood",
    style: "solarpunk",
    category: "cyberpunk",
    source: "curated",
  },
  {
    id: "ip-056",
    prompt:
      "Close-up of a cybernetic hand holding a small live plant, brushed metal fingers, soft window light, macro detail on the circuitry under the skin, clinical white and green palette",
    style: "sci-fi macro",
    category: "cyberpunk",
    source: "awesome-gpt-image-2",
  },
  {
    id: "ip-057",
    prompt:
      "Dystopian megacity overpass, endless rows of tiny windows, a single red balloon rising, desaturated concrete palette with one accent of red, overcast light",
    style: "dystopia",
    category: "cyberpunk",
    source: "curated",
  },
  {
    id: "ip-058",
    prompt:
      "Abandoned arcade in a derelict station, dead machines glowing faintly, one machine still lit showing the text \"PLAYER 1\", dust in a shaft of cold light, blue and purple palette",
    style: "sci-fi environment",
    category: "cyberpunk",
    source: "curated",
  },
  {
    id: "ip-059",
    prompt:
      "Astronaut floating above a city of glass, Earth's limb in the background, hard rim light from the sun, deep black space, warm city lights below, 50mm lens look",
    style: "sci-fi photography",
    category: "cyberpunk",
    source: "awesome-gpt-image-2",
  },
  {
    id: "ip-060",
    prompt:
      "Steampunk airship dock at dawn, brass and canvas, moors and signal lamps, low warm fog, amber and sepia palette, intricate rigging detail",
    style: "steampunk",
    category: "cyberpunk",
    source: "curated",
  },

  // Fantasy
  {
    id: "ip-061",
    prompt:
      "Epic fantasy landscape of a castle on a cliff at dawn, banners in the wind, mist in the valley below, soft painterly light, deep green and gold palette",
    style: "epic fantasy",
    category: "fantasy",
    source: "curated",
  },
  {
    id: "ip-062",
    prompt:
      "Portrait of a forest witch with antler headdress, dappled woodland light, moss and lichen textures, amber and moss green palette, painterly detail",
    style: "fantasy portrait",
    category: "fantasy",
    source: "curated",
  },
  {
    id: "ip-063",
    prompt:
      "A young dragon curled around a village roof at night, small scales catching moonlight, warm hearth glow below, blue and gold palette, storybook composition",
    style: "storybook fantasy",
    category: "fantasy",
    source: "awesome-gpt-image-2",
  },
  {
    id: "ip-064",
    prompt:
      "Underground elven hall carved into a crystal cave, bioluminescent veins in the rock, long tables set for a feast, cool blue and violet glow, cinematic wide angle",
    style: "epic fantasy",
    category: "fantasy",
    source: "curated",
  },
  {
    id: "ip-065",
    prompt:
      "A knight and a giant moth perched on a branch, both still, morning fog, muted grey and cream palette, one accent of teal on the moth's wings, quiet mood",
    style: "storybook fantasy",
    category: "fantasy",
    source: "curated",
  },
  {
    id: "ip-066",
    prompt:
      "Fantasy map of an archipelago, parchment texture, hand-drawn compass rose, small ship icons, ink lines with watercolor wash, sea monster in the southern strait",
    style: "fantasy cartography",
    category: "fantasy",
    source: "awesome-gpt-image-2",
  },
  {
    id: "ip-067",
    prompt:
      "A floating island library, books chained to drifting shelves, a rope bridge to a smaller island, golden hour light, warm amber and sky blue palette, painterly style",
    style: "whimsical fantasy",
    category: "fantasy",
    source: "curated",
  },
  {
    id: "ip-068",
    prompt:
      "Dark fantasy: a hooded figure walking a salt flat under a blood-red moon, long shadow, monochrome palette with one red accent, minimal detail, high contrast",
    style: "dark fantasy",
    category: "fantasy",
    source: "curated",
  },
  {
    id: "ip-069",
    prompt:
      "Fairy ring in a meadow at twilight, mushrooms glowing soft blue, tiny lanterns on stems, dew on the grass, violet and green palette, dreamy soft focus",
    style: "whimsical fantasy",
    category: "fantasy",
    source: "awesome-gpt-image-2",
  },
  {
    id: "ip-070",
    prompt:
      "A sea serpent rising between two trading ships, spray catching the sun, 18th-century engraving style with watercolor tint, sepia and teal palette, fine crosshatching",
    style: "fantasy illustration",
    category: "fantasy",
    source: "curated",
  },

  // Flat Design & Vector
  {
    id: "ip-071",
    prompt:
      "Flat design illustration of a remote worker on a video call with a cat in frame, geometric shapes, muted teal and coral palette, no outlines, generous negative space",
    style: "flat design",
    category: "flat-design",
    source: "curated",
  },
  {
    id: "ip-072",
    prompt:
      "Minimal vector illustration of a city skyline at night, two-tone gradient sky, geometric buildings with lit windows, one flying car, deep indigo and soft yellow palette",
    style: "vector illustration",
    category: "flat-design",
    source: "curated",
  },
  {
    id: "ip-073",
    prompt:
      "Flat icon set of a camping kit: tent, lantern, compass, water bottle, isometric style, warm orange and sage palette, simple geometric forms, soft drop shadows",
    style: "flat icons",
    category: "flat-design",
    source: "awesome-gpt-image-2",
  },
  {
    id: "ip-074",
    prompt:
      "Bold flat illustration of a woman planting a tree in a city block, thick simple shapes, sunny yellow and green palette, geometric clouds, poster composition with the text \"PLANT MORE\" at the bottom",
    style: "flat design",
    category: "flat-design",
    source: "curated",
  },
  {
    id: "ip-075",
    prompt:
      "Geometric abstract composition of a face profile built from circles and triangles, Bauhaus inspired, primary color palette on cream, flat matte finish",
    style: "geometric abstraction",
    category: "flat-design",
    source: "curated",
  },
  {
    id: "ip-076",
    prompt:
      "Flat design of a cozy reading nook in a treehouse, round shapes, warm amber and brown palette, one glowing lamp, simple leaf shapes, storybook feel",
    style: "flat design",
    category: "flat-design",
    source: "awesome-gpt-image-2",
  },
  {
    id: "ip-077",
    prompt:
      "Memphis-style collage of a dancing character, squiggles, confetti, and geometric shapes, bright 80s palette: hot pink, lime, cobalt, on off-white, flat matte",
    style: "memphis design",
    category: "flat-design",
    source: "curated",
  },
  {
    id: "ip-078",
    prompt:
      "Infographic illustration of the water cycle, flat vector style, soft blue and white palette, simple clouds, rain, and sun icons, clean arrows, label text \"EVAPORATION\" on the sun ray",
    style: "vector illustration",
    category: "flat-design",
    source: "curated",
  },
  {
    id: "ip-079",
    prompt:
      "Flat poster of a rocket launch at night, geometric stars, long motion streaks, navy and orange palette, bold sans-serif text \"LIFT OFF 00:00\" across the top",
    style: "flat design",
    category: "flat-design",
    source: "awesome-gpt-image-2",
  },
  {
    id: "ip-080",
    prompt:
      "Minimal line-and-fill illustration of a breakfast table: toast, coffee, fruit, one bowl, flat pastel palette, thin outlines, centered composition on warm cream",
    style: "minimal illustration",
    category: "flat-design",
    source: "curated",
  },

  // Isometric
  {
    id: "ip-081",
    prompt:
      "Isometric 3D scene of a tiny ramen shop at night, steam rising from the counter, warm interior light spilling onto the street, clean pastel palette, soft shadows",
    style: "isometric",
    category: "isometric",
    source: "curated",
  },
  {
    id: "ip-082",
    prompt:
      "Isometric cross-section of a smart city block, underground subway, street level with tiny cars, rooftop solar, layered cutaway view, flat colors, clean lines",
    style: "isometric cutaway",
    category: "isometric",
    source: "curated",
  },
  {
    id: "ip-083",
    prompt:
      "Cozy isometric cabin in the snow, a path of footprints to the door, smoke from the chimney, warm yellow windows, deep blue night, soft ambient occlusion",
    style: "isometric",
    category: "isometric",
    source: "awesome-gpt-image-2",
  },
  {
    id: "ip-084",
    prompt:
      "Isometric potion lab, bubbling beakers in green and purple, corked bottles, a small frog assistant, soft studio lighting, clean matte materials",
    style: "isometric",
    category: "isometric",
    source: "curated",
  },
  {
    id: "ip-085",
    prompt:
      "Isometric desk setup at golden hour, mechanical keyboard, a small succulent, a coffee mug with steam, warm light from a window on the left, muted palette, clean shading",
    style: "isometric",
    category: "isometric",
    source: "curated",
  },
  {
    id: "ip-086",
    prompt:
      "Isometric underground burrow of a mole, warm lamp light, tiny shelves and a radio, soft brown palette, rounded organic shapes, gentle shadows",
    style: "isometric",
    category: "isometric",
    source: "awesome-gpt-image-2",
  },
  {
    id: "ip-087",
    prompt:
      "Isometric floating sky temple, floating rock steps, waterfalls off the edges, warm stone and turquoise palette, soft clouds, clean render",
    style: "isometric",
    category: "isometric",
    source: "curated",
  },
  {
    id: "ip-088",
    prompt:
      "Isometric bakery at dawn, display case with croissants, a sleepy baker, warm golden light through the front window, cream and brown palette, soft shadows",
    style: "isometric",
    category: "isometric",
    source: "curated",
  },
  {
    id: "ip-089",
    prompt:
      "Isometric server room, racks with blinking green and red lights, one technician with a tablet, cool blue palette with warm orange floor strips, clean matte render",
    style: "isometric",
    category: "isometric",
    source: "awesome-gpt-image-2",
  },
  {
    id: "ip-090",
    prompt:
      "Isometric garden in a jar, tiny tomato plant, a snail, a small sign reading \"GROW\", soft pastel palette, gentle light from above, clean edges",
    style: "isometric",
    category: "isometric",
    source: "curated",
  },

  // Hand-drawn & Line Art
  {
    id: "ip-091",
    prompt:
      "Loose graphite sketch of a fisherman on a dock at dusk, confident pencil strokes, minimal shading, one small bird, monochrome with cool grey tone, paper texture",
    style: "pencil sketch",
    category: "hand-drawn",
    source: "hand-drawn",
  },
  {
    id: "ip-092",
    prompt:
      "Crosshatched ink drawing of a lighthouse in a storm, dramatic diagonal hatching, one white break in the dark, strong contrast, vintage print feel",
    style: "ink crosshatch",
    category: "hand-drawn",
    source: "hand-drawn",
  },
  {
    id: "ip-093",
    prompt:
      "Single continuous line drawing of a woman's profile with a flower, thin elegant line, lots of negative space, warm white background, one dot of color for the flower",
    style: "line art",
    category: "hand-drawn",
    source: "hand-drawn",
  },
  {
    id: "ip-094",
    prompt:
      "Charcoal study of hands holding a cup of tea, smudged soft shading, dark background, warm glow on the hands, expressive strokes, intimate scale",
    style: "charcoal",
    category: "hand-drawn",
    source: "hand-drawn",
  },
  {
    id: "ip-095",
    prompt:
      "Doodle-style illustration of a day in the life: alarm clock, coffee, bicycle, laptop, crescent moon, connected by a single path, playful hand-drawn lines, monochrome with one accent of orange",
    style: "doodle",
    category: "hand-drawn",
    source: "hand-drawn",
  },
  {
    id: "ip-096",
    prompt:
      "Architectural ink drawing of a spiral staircase, fine linework, one sheet of paper background, subtle grey wash for depth, technical but warm",
    style: "technical ink",
    category: "hand-drawn",
    source: "hand-drawn",
  },
  {
    id: "ip-097",
    prompt:
      "Colored pencil illustration of a hummingbird on a cosmos flower, layered strokes, soft violet and green palette, visible paper tooth, gentle detail",
    style: "colored pencil",
    category: "hand-drawn",
    source: "hand-drawn",
  },
  {
    id: "ip-098",
    prompt:
      "Sumi-e style ink painting of a crane in flight, one bold brush stroke for the wing, seal stamp in red in the corner, vast white negative space, traditional paper texture",
    style: "ink wash",
    category: "hand-drawn",
    source: "hand-drawn",
  },
  {
    id: "ip-099",
    prompt:
      "Rough sketchbook page of a mountain hut, quick gestural lines, a few hatch marks for shadow, a small figure with a backpack, pencil on textured paper, wobble in the lines",
    style: "sketchbook",
    category: "hand-drawn",
    source: "hand-drawn",
  },
  {
    id: "ip-100",
    prompt:
      "Hand-drawn zine cover of a tiny robot delivering mail, ballpoint pen lines, one flat wash of blue, stamp-like border, the text \"ISSUE 7: RAINY DAY DELIVERY\" in hand lettering",
    style: "ballpoint pen",
    category: "hand-drawn",
    source: "hand-drawn",
  },
];
