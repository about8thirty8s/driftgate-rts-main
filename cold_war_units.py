# Full Cold War RTS unit roster — Driftgate Studios
# Allied (NATO/US/West) vs Soviet (Warsaw Pact/proxy forces)
# Era: 1950–1991 — Korean War through Gulf War eve

ALLIED_UNITS = [

    # ── INFANTRY ──────────────────────────────────────────────────────────────
    {
        "id": "infantry_rifleman",
        "displayName": "GI Rifleman",
        "category": "infantry",
        "era": "1950–1991",
        "hp": 100, "armour": "light", "speed": 2.2, "visionRadius": 6,
        "cost": 150, "buildTime": 5, "requiredStructure": "barracks",
        "weapons": ["rifle_m16"],
        "canEnterTrench": True, "canGarrison": True, "canCapture": True,
        "veterancyThresholds": [3, 8, 15],
        "tags": ["infantry", "light", "can_capture"],
        "note": "Standard NATO rifle infantry. Transitions from M1 Garand (Korea) to M16 (Vietnam) to M16A2 (Cold War end). Core of any push."
    },
    {
        "id": "infantry_marine",
        "displayName": "Marine Assault",
        "category": "infantry",
        "era": "1950–1991",
        "hp": 120, "armour": "light", "speed": 2.4, "visionRadius": 7,
        "cost": 225, "buildTime": 6, "requiredStructure": "barracks",
        "weapons": ["rifle_m16", "grenade_m26"],
        "canEnterTrench": True, "canGarrison": True, "canCapture": True,
        "veterancyThresholds": [3, 8, 15],
        "tags": ["infantry", "light", "can_capture", "assault"],
        "note": "Elite assault infantry. Higher HP and carries frag grenades as secondary. Amphibious landing capable."
    },
    {
        "id": "infantry_engineer",
        "displayName": "Combat Engineer",
        "category": "infantry",
        "era": "1950–1991",
        "hp": 75, "armour": "light", "speed": 1.8, "visionRadius": 5,
        "cost": 300, "buildTime": 8, "requiredStructure": "barracks",
        "weapons": ["pistol_m1911"],
        "canEnterTrench": True, "canCapture": True, "canRepair": True, "canBuild": True,
        "tags": ["infantry", "light", "can_capture", "engineer"],
        "note": "Lays mines, clears minefields, repairs vehicles, builds field fortifications. No combat value alone — keep protected."
    },
    {
        "id": "infantry_ranger",
        "displayName": "Army Ranger",
        "category": "infantry",
        "era": "1965–1991",
        "hp": 110, "armour": "light", "speed": 2.8, "visionRadius": 9,
        "cost": 400, "buildTime": 9, "requiredStructure": "barracks",
        "weapons": ["rifle_m16", "m72_law"],
        "canEnterTrench": True, "canGarrison": True, "canCapture": True, "canAmbush": True,
        "veterancyThresholds": [2, 6, 12],
        "tags": ["infantry", "light", "can_capture", "anti_armor", "special_forces"],
        "note": "Special forces infantry. Carries M72 LAW for anti-tank. Ambush capable. Fast and high vision. Expensive but deadly."
    },
    {
        "id": "infantry_grenadier",
        "displayName": "Grenadier",
        "category": "infantry",
        "era": "1960–1991",
        "hp": 90, "armour": "light", "speed": 2.0, "visionRadius": 8,
        "cost": 175, "buildTime": 7, "requiredStructure": "barracks",
        "weapons": ["grenade_launcher_m79"],
        "canEnterTrench": True, "canGarrison": True,
        "veterancyThresholds": [3, 8, 15],
        "tags": ["infantry", "light", "anti_armor", "explosive"],
        "note": "Thumper specialist. M79 grenade launcher provides area denial and anti-light-armour. Good for flushing entrenched enemies."
    },
    {
        "id": "infantry_stinger",
        "displayName": "Stinger Operator",
        "category": "infantry",
        "era": "1981–1991",
        "hp": 85, "armour": "light", "speed": 1.9, "visionRadius": 10,
        "cost": 350, "buildTime": 8, "requiredStructure": "barracks",
        "weapons": ["stinger_fim92"],
        "canEnterTrench": True, "canGarrison": True,
        "veterancyThresholds": [3, 8, 15],
        "tags": ["infantry", "light", "anti_air", "manpad"],
        "note": "Man-portable air defence. FIM-92 Stinger infrared homing missile. Counters helicopters and low-altitude jets. Limited ammo — must resupply."
    },

    # ── VEHICLES ──────────────────────────────────────────────────────────────
    {
        "id": "vehicle_jeep",
        "displayName": "M151 MUTT Jeep",
        "category": "vehicle",
        "era": "1960–1985",
        "hp": 150, "armour": "light", "speed": 5.0, "visionRadius": 8,
        "cost": 300, "buildTime": 8, "requiredStructure": "war_factory",
        "weapons": ["m60_machinegun"],
        "crushesInfantry": True,
        "veterancyThresholds": [3, 8, 15],
        "tags": ["vehicle", "light", "fast", "recon"],
        "note": "Fast scout. M60 MG. Used from Vietnam through late Cold War. Excellent early-game harass and recon pressure."
    },
    {
        "id": "vehicle_hmmwv",
        "displayName": "HMMWV (Humvee)",
        "category": "vehicle",
        "era": "1985–1991",
        "hp": 200, "armour": "light", "speed": 4.8, "visionRadius": 9,
        "cost": 400, "buildTime": 9, "requiredStructure": "war_factory",
        "weapons": ["m2_browning", "tow_missile"],
        "crushesInfantry": True,
        "veterancyThresholds": [3, 8, 15],
        "tags": ["vehicle", "light", "fast", "recon", "anti_armor"],
        "note": "Late Cold War multi-role. .50 cal + TOW anti-tank missile. Expensive but extremely versatile. The Jeep's successor."
    },
    {
        "id": "vehicle_m113",
        "displayName": "M113 APC",
        "category": "vehicle",
        "era": "1960–1991",
        "hp": 250, "armour": "medium", "speed": 3.2, "visionRadius": 6,
        "cost": 600, "buildTime": 12, "requiredStructure": "war_factory",
        "weapons": ["m2_browning"],
        "canTransport": True, "transportCapacity": 5,
        "crushesInfantry": True,
        "veterancyThresholds": [3, 8, 15],
        "tags": ["vehicle", "medium", "transport", "amphibious"],
        "note": "Workhorse APC. Korean War to Gulf War. Amphibious capable. Transports 5 infantry. Vulnerable to heavy AT weapons."
    },
    {
        "id": "vehicle_m60_tank",
        "displayName": "M60 Patton",
        "category": "vehicle",
        "era": "1960–1991",
        "hp": 420, "armour": "heavy", "speed": 1.8, "visionRadius": 6,
        "cost": 850, "buildTime": 15, "requiredStructure": "war_factory",
        "weapons": ["cannon_105mm"],
        "crushesInfantry": True,
        "veterancyThresholds": [3, 8, 15],
        "tags": ["vehicle", "heavy", "tracked", "main_battle_tank"],
        "note": "NATO standard MBT through most of the Cold War. 105mm rifled cannon. Replaced by M1 Abrams late Cold War."
    },
    {
        "id": "vehicle_m1_abrams",
        "displayName": "M1 Abrams",
        "category": "vehicle",
        "era": "1980–1991",
        "hp": 600, "armour": "heavy", "speed": 2.4, "visionRadius": 7,
        "cost": 1400, "buildTime": 22, "requiredStructure": "war_factory",
        "weapons": ["cannon_120mm"],
        "crushesInfantry": True,
        "veterancyThresholds": [2, 6, 12],
        "tags": ["vehicle", "heavy", "tracked", "main_battle_tank", "advanced"],
        "note": "Late Cold War NATO super-tank. 120mm smoothbore. Turbine engine — fastest heavy tank in game. Expensive. Counters T-72 decisively."
    },
    {
        "id": "vehicle_m270_mlrs",
        "displayName": "M270 MLRS",
        "category": "vehicle",
        "era": "1983–1991",
        "hp": 180, "armour": "light", "speed": 2.0, "visionRadius": 5,
        "cost": 1100, "buildTime": 18, "requiredStructure": "war_factory",
        "weapons": ["mlrs_rocket_salvo"],
        "crushesInfantry": False,
        "veterancyThresholds": [3, 8, 15],
        "tags": ["vehicle", "artillery", "rocket", "area_denial", "long_range"],
        "note": "Multiple Launch Rocket System. Saturation area fire. Reload is slow — use sparingly. No minimum range. Support unit."
    },

    # ── AIR ───────────────────────────────────────────────────────────────────
    {
        "id": "air_huey",
        "displayName": "UH-1 Huey",
        "category": "air",
        "era": "1959–1991",
        "hp": 150, "armour": "light", "speed": 6.0, "visionRadius": 10,
        "cost": 1200, "buildTime": 18, "requiredStructure": "helipad",
        "weapons": ["m60_door_gun", "rocket_pod_2_75"],
        "isHelicopter": True, "hoverHeight": 8, "canTransport": True, "transportCapacity": 8,
        "maxAmmo": 20, "rearmTime": 10,
        "veterancyThresholds": [3, 8, 15],
        "tags": ["air", "helicopter", "transport", "gunship"],
        "note": "Iconic Cold War transport gunship. Slicks carry troops, hogs carry rockets. Both configs available."
    },
    {
        "id": "air_ah64_apache",
        "displayName": "AH-64 Apache",
        "category": "air",
        "era": "1986–1991",
        "hp": 250, "armour": "light", "speed": 5.0, "visionRadius": 12,
        "cost": 2200, "buildTime": 24, "requiredStructure": "helipad",
        "weapons": ["hellfire_missile", "m230_chain_gun"],
        "isHelicopter": True, "hoverHeight": 8,
        "maxAmmo": 16, "rearmTime": 14,
        "veterancyThresholds": [2, 6, 12],
        "tags": ["air", "helicopter", "anti_armor", "gunship", "advanced"],
        "note": "Dedicated tank-hunter helicopter. Hellfire laser-guided missiles. 30mm chain gun. Decimates armour columns. High priority target."
    },
    {
        "id": "air_f86_sabre",
        "displayName": "F-86 Sabre",
        "category": "air",
        "era": "1950–1959",
        "hp": 160, "armour": "light", "speed": 8.0, "visionRadius": 10,
        "cost": 1400, "buildTime": 20, "requiredStructure": "airfield",
        "weapons": ["m3_browning_20mm", "napalm_bomb"],
        "isJet": True, "cruiseHeight": 10,
        "maxAmmo": 24, "rearmTime": 12,
        "veterancyThresholds": [3, 8, 15],
        "tags": ["air", "jet", "korean_war", "strike", "dogfighter"],
        "note": "Korean War era jet. First swept-wing dogfighter. Fast for its era. Duelled MiG-15 over Korea. Napalm capable for ground attack."
    },
    {
        "id": "air_f4_phantom",
        "displayName": "F-4 Phantom II",
        "category": "air",
        "era": "1960–1991",
        "hp": 200, "armour": "light", "speed": 10.0, "visionRadius": 12,
        "cost": 2000, "buildTime": 25, "requiredStructure": "airfield",
        "weapons": ["aim7_sparrow", "napalm_bomb"],
        "isJet": True, "cruiseHeight": 12,
        "maxAmmo": 30, "rearmTime": 15,
        "veterancyThresholds": [3, 8, 15],
        "tags": ["air", "jet", "strike", "anti_ground", "fast_mover"],
        "note": "Multi-role workhorse. Vietnam and beyond. AIM-7 Sparrow air-to-air + napalm ground attack. No gun originally — fixed with gun pod."
    },
    {
        "id": "air_a10_warthog",
        "displayName": "A-10 Warthog",
        "category": "air",
        "era": "1977–1991",
        "hp": 280, "armour": "medium", "speed": 4.5, "visionRadius": 11,
        "cost": 2500, "buildTime": 28, "requiredStructure": "airfield",
        "weapons": ["gau8_avenger", "maverick_agm65"],
        "isJet": True, "cruiseHeight": 6,
        "maxAmmo": 40, "rearmTime": 16,
        "veterancyThresholds": [2, 6, 12],
        "tags": ["air", "jet", "close_air_support", "anti_armor", "tank_buster"],
        "note": "Built around the GAU-8 30mm cannon. Can fly slower and lower than any other jet. Exceptional tank-killer. Hard to shoot down — titanium tub cockpit."
    },
    {
        "id": "air_b52",
        "displayName": "B-52 Stratofortress",
        "category": "air",
        "era": "1955–1991",
        "hp": 300, "armour": "medium", "speed": 7.0, "visionRadius": 14,
        "cost": 3000, "buildTime": 35, "requiredStructure": "airfield",
        "weapons": ["mk82_bomb_carpet"],
        "isJet": True, "cruiseHeight": 15,
        "maxAmmo": 50, "rearmTime": 20, "aoeRadius": 4,
        "veterancyThresholds": [3, 8, 15],
        "tags": ["air", "jet", "bomber", "carpet_bomb", "strategic"],
        "note": "Strategic nuclear-capable bomber used conventionally. Arc Light carpet bombing missions terrorised entire grid squares. Win condition unit."
    },

    # ── NAVAL ─────────────────────────────────────────────────────────────────
    {
        "id": "naval_patrol_boat",
        "displayName": "PBR Patrol Boat",
        "category": "naval",
        "era": "1966–1991",
        "hp": 300, "armour": "light", "speed": 4.0, "visionRadius": 10,
        "cost": 500, "buildTime": 12, "requiredStructure": "naval_yard",
        "weapons": ["m2_browning", "m60_machinegun"],
        "isNaval": True,
        "veterancyThresholds": [3, 8, 15],
        "tags": ["naval", "light", "fast", "river_patrol"],
        "note": "Patrol Boat, River. Twin MGs, fast, shallow draft. Controls rivers and coastal waterways. Vulnerable to RPGs from shore."
    },
    {
        "id": "naval_destroyer",
        "displayName": "Fletcher-class Destroyer",
        "category": "naval",
        "era": "1943–1970",
        "hp": 800, "armour": "medium", "speed": 3.5, "visionRadius": 14,
        "cost": 2000, "buildTime": 30, "requiredStructure": "naval_yard",
        "weapons": ["naval_5inch_gun", "mk44_torpedo"],
        "isNaval": True,
        "veterancyThresholds": [2, 6, 12],
        "tags": ["naval", "heavy", "shore_bombardment", "anti_naval"],
        "note": "WWII-era destroyer still active through Korea and Vietnam. 5-inch naval guns provide devastating shore bombardment. Torpedoes for naval combat."
    },
]

SOVIET_UNITS = [

    # ── INFANTRY ──────────────────────────────────────────────────────────────
    {
        "id": "infantry_conscript",
        "displayName": "Soviet Conscript",
        "category": "infantry",
        "era": "1950–1991",
        "hp": 90, "armour": "light", "speed": 2.2, "visionRadius": 5,
        "cost": 80, "buildTime": 4, "requiredStructure": "barracks",
        "weapons": ["rifle_ak47"],
        "canEnterTrench": True, "canGarrison": True, "canCapture": True,
        "veterancyThresholds": [4, 10, 20],
        "tags": ["infantry", "light", "can_capture", "mass_production"],
        "note": "Cheap, numerous. Lower veteran thresholds reflect high attrition doctrine. Quantity is its own quality. Overwhelm with numbers."
    },
    {
        "id": "infantry_vietcong",
        "displayName": "Viet Cong",
        "category": "infantry",
        "era": "1959–1975",
        "hp": 80, "armour": "light", "speed": 2.8, "visionRadius": 6,
        "cost": 75, "buildTime": 4, "requiredStructure": "barracks",
        "weapons": ["rifle_ak47"],
        "canEnterTrench": True, "canGarrison": True, "canAmbush": True, "canCapture": True,
        "veterancyThresholds": [3, 8, 15],
        "tags": ["infantry", "light", "can_capture", "guerrilla"],
        "note": "Guerrilla fighter. Ambush bonus from jungle/trench. Built tunnels, fought from the inside out. Cheapest combat unit."
    },
    {
        "id": "infantry_spetsnaz",
        "displayName": "Spetsnaz",
        "category": "infantry",
        "era": "1950–1991",
        "hp": 130, "armour": "light", "speed": 3.0, "visionRadius": 10,
        "cost": 500, "buildTime": 10, "requiredStructure": "barracks",
        "weapons": ["rifle_ak74", "rpg7"],
        "canEnterTrench": True, "canGarrison": True, "canCapture": True, "canAmbush": True,
        "veterancyThresholds": [2, 5, 10],
        "tags": ["infantry", "light", "special_forces", "anti_armor", "can_capture"],
        "note": "Soviet special forces. AK-74 + RPG-7. Highest base stats of any infantry. Excellent in ambush and behind enemy lines. Very expensive."
    },
    {
        "id": "infantry_north_korean",
        "displayName": "NK Assault Infantry",
        "category": "infantry",
        "era": "1950–1953",
        "hp": 95, "armour": "light", "speed": 2.3, "visionRadius": 5,
        "cost": 70, "buildTime": 3, "requiredStructure": "barracks",
        "weapons": ["rifle_ppsh41", "satchel_charge"],
        "canEnterTrench": True, "canGarrison": True, "canCapture": True,
        "veterancyThresholds": [4, 10, 20],
        "tags": ["infantry", "light", "can_capture", "korean_war"],
        "note": "Korean War era North Korean infantry. PPSh-41 SMG — high ROF at short range. Satchel charges for structure demolition."
    },
    {
        "id": "infantry_rpg_crew",
        "displayName": "RPG Crew",
        "category": "infantry",
        "era": "1960–1991",
        "hp": 85, "armour": "light", "speed": 2.0, "visionRadius": 7,
        "cost": 200, "buildTime": 6, "requiredStructure": "barracks",
        "weapons": ["rpg7"],
        "canEnterTrench": True, "canGarrison": True,
        "veterancyThresholds": [3, 8, 15],
        "tags": ["infantry", "light", "anti_armor", "anti_air_light"],
        "note": "RPG-7 anti-tank team. Effective against APCs, helicopters, and light vehicles. Can penetrate medium armour at close range."
    },
    {
        "id": "infantry_strela_aa",
        "displayName": "Strela AA Team",
        "category": "infantry",
        "era": "1968–1991",
        "hp": 80, "armour": "light", "speed": 1.8, "visionRadius": 11,
        "cost": 280, "buildTime": 7, "requiredStructure": "barracks",
        "weapons": ["strela_2_manpad"],
        "canEnterTrench": True,
        "veterancyThresholds": [3, 8, 15],
        "tags": ["infantry", "light", "anti_air", "manpad"],
        "note": "SA-7 Grail MANPAD. Soviet answer to Stinger. Effective vs helicopters and low-fast jets. Used widely in proxy conflicts from 1972 onward."
    },

    # ── VEHICLES ──────────────────────────────────────────────────────────────
    {
        "id": "vehicle_bt7_tank",
        "displayName": "T-34/85",
        "category": "vehicle",
        "era": "1950–1953",
        "hp": 320, "armour": "heavy", "speed": 2.2, "visionRadius": 5,
        "cost": 600, "buildTime": 12, "requiredStructure": "war_factory",
        "weapons": ["cannon_85mm"],
        "crushesInfantry": True,
        "veterancyThresholds": [3, 8, 15],
        "tags": ["vehicle", "heavy", "tracked", "korean_war"],
        "note": "Korean War-era Soviet tank supplied to North Korea. Terrified Allied forces in 1950. Outclassed later by NATO tanks but fast and reliable."
    },
    {
        "id": "vehicle_t55",
        "displayName": "T-55",
        "category": "vehicle",
        "era": "1958–1991",
        "hp": 380, "armour": "heavy", "speed": 1.9, "visionRadius": 5,
        "cost": 750, "buildTime": 13, "requiredStructure": "war_factory",
        "weapons": ["cannon_100mm"],
        "crushesInfantry": True,
        "veterancyThresholds": [3, 8, 15],
        "tags": ["vehicle", "heavy", "tracked"],
        "note": "Warsaw Pact MBT. Used across Africa, Middle East, Asia. 100mm cannon. Highly moddable engine — mass produced globally. Vietnam, Yom Kippur, Angola."
    },
    {
        "id": "vehicle_t72",
        "displayName": "T-72",
        "category": "vehicle",
        "era": "1973–1991",
        "hp": 500, "armour": "heavy", "speed": 2.0, "visionRadius": 6,
        "cost": 1000, "buildTime": 17, "requiredStructure": "war_factory",
        "weapons": ["cannon_125mm"],
        "crushesInfantry": True,
        "veterancyThresholds": [3, 8, 15],
        "tags": ["vehicle", "heavy", "tracked", "main_battle_tank"],
        "note": "Main Soviet MBT of the mid-to-late Cold War. Auto-loader means smaller crew but faster fire rate. Matched against M60 and eventually M1 Abrams."
    },
    {
        "id": "vehicle_btr60",
        "displayName": "BTR-60 APC",
        "category": "vehicle",
        "era": "1961–1991",
        "hp": 220, "armour": "medium", "speed": 3.5, "visionRadius": 6,
        "cost": 500, "buildTime": 10, "requiredStructure": "war_factory",
        "weapons": ["kpvt_14mm"],
        "canTransport": True, "transportCapacity": 8,
        "crushesInfantry": True,
        "veterancyThresholds": [3, 8, 15],
        "tags": ["vehicle", "medium", "transport", "amphibious"],
        "note": "Eight-wheeled APC. Amphibious. KPVT 14.5mm heavy MG. Carries 8 infantry. Used by Warsaw Pact and numerous proxy armies worldwide."
    },
    {
        "id": "vehicle_bmp1",
        "displayName": "BMP-1 IFV",
        "category": "vehicle",
        "era": "1966–1991",
        "hp": 280, "armour": "medium", "speed": 3.0, "visionRadius": 7,
        "cost": 700, "buildTime": 14, "requiredStructure": "war_factory",
        "weapons": ["cannon_73mm", "malyutka_atgm"],
        "canTransport": True, "transportCapacity": 8,
        "crushesInfantry": True,
        "veterancyThresholds": [3, 8, 15],
        "tags": ["vehicle", "medium", "transport", "anti_armor", "ifv"],
        "note": "World's first true infantry fighting vehicle. 73mm low-velocity cannon + Malyutka ATGM. Can fight while transporting troops. Yom Kippur, Afghanistan."
    },
    {
        "id": "vehicle_zsu23_aa",
        "displayName": "ZSU-23-4 Shilka",
        "category": "vehicle",
        "era": "1965–1991",
        "hp": 200, "armour": "light", "speed": 2.0, "visionRadius": 10,
        "cost": 800, "buildTime": 14, "requiredStructure": "war_factory",
        "weapons": ["zsu_quad_23mm"],
        "crushesInfantry": True,
        "veterancyThresholds": [3, 8, 15],
        "tags": ["vehicle", "anti_air", "tracked", "area_denial"],
        "note": "Self-propelled quad 23mm AA platform. Feared by all Allied pilots. Radar-guided. Also devastates infantry. Nicknamed 'Stalin's Organ' for its fire sound."
    },
    {
        "id": "vehicle_grad_mlrs",
        "displayName": "BM-21 Grad",
        "category": "vehicle",
        "era": "1963–1991",
        "hp": 160, "armour": "light", "speed": 2.2, "visionRadius": 5,
        "cost": 950, "buildTime": 16, "requiredStructure": "war_factory",
        "weapons": ["grad_rocket_salvo"],
        "crushesInfantry": False,
        "veterancyThresholds": [3, 8, 15],
        "tags": ["vehicle", "artillery", "rocket", "area_denial", "long_range"],
        "note": "40-tube 122mm rocket artillery. Ripple fire saturates entire grid squares. Slow reload. Countered by counterbattery radar + air strike. Widely exported."
    },

    # ── AIR ───────────────────────────────────────────────────────────────────
    {
        "id": "air_mig15",
        "displayName": "MiG-15 Fagot",
        "category": "air",
        "era": "1950–1960",
        "hp": 140, "armour": "light", "speed": 8.5, "visionRadius": 8,
        "cost": 1200, "buildTime": 18, "requiredStructure": "airfield",
        "weapons": ["n37_cannon", "n23_cannon"],
        "isJet": True, "cruiseHeight": 10,
        "maxAmmo": 20, "rearmTime": 12,
        "veterancyThresholds": [3, 8, 15],
        "tags": ["air", "jet", "korean_war", "dogfighter", "interceptor"],
        "note": "Korean War shock. Outperformed Allied piston aircraft and early jets. Twin cannon armament. Fought F-86 over MiG Alley. Fast, agile, cannon-only."
    },
    {
        "id": "air_mig21",
        "displayName": "MiG-21 Fishbed",
        "category": "air",
        "era": "1959–1991",
        "hp": 180, "armour": "light", "speed": 11.0, "visionRadius": 10,
        "cost": 1800, "buildTime": 22, "requiredStructure": "airfield",
        "weapons": ["r60_missile", "gsh23_cannon"],
        "isJet": True, "cruiseHeight": 11,
        "maxAmmo": 24, "rearmTime": 14,
        "veterancyThresholds": [3, 8, 15],
        "tags": ["air", "jet", "interceptor", "anti_air", "fast_mover"],
        "note": "Most-produced supersonic jet in history. Vietnam, Middle East, Africa, Asia. Faster than F-4 but shorter range and less payload."
    },
    {
        "id": "air_mig29",
        "displayName": "MiG-29 Fulcrum",
        "category": "air",
        "era": "1983–1991",
        "hp": 220, "armour": "light", "speed": 12.0, "visionRadius": 13,
        "cost": 2400, "buildTime": 28, "requiredStructure": "airfield",
        "weapons": ["r73_missile", "r60_missile", "gsh301_cannon"],
        "isJet": True, "cruiseHeight": 13,
        "maxAmmo": 28, "rearmTime": 16,
        "veterancyThresholds": [2, 6, 12],
        "tags": ["air", "jet", "air_superiority", "anti_air", "advanced"],
        "note": "Late Cold War Soviet air superiority fighter. Helmet-mounted sight allows off-boresight shots. Extremely agile. Counters F-15 and F-16."
    },
    {
        "id": "air_su25_frogfoot",
        "displayName": "Su-25 Frogfoot",
        "category": "air",
        "era": "1981–1991",
        "hp": 260, "armour": "medium", "speed": 4.8, "visionRadius": 10,
        "cost": 2100, "buildTime": 24, "requiredStructure": "airfield",
        "weapons": ["gsh302_cannon", "kh25ml_missile", "s8_rocket_pod"],
        "isJet": True, "cruiseHeight": 5,
        "maxAmmo": 36, "rearmTime": 14,
        "veterancyThresholds": [2, 6, 12],
        "tags": ["air", "jet", "close_air_support", "anti_armor", "afghanistan"],
        "note": "Soviet A-10 equivalent. Designed for close air support in Afghanistan. Titanium armour around cockpit. Slower and lower than MiGs. Devastating on armour."
    },
    {
        "id": "air_mi24_hind",
        "displayName": "Mi-24 Hind",
        "category": "air",
        "era": "1972–1991",
        "hp": 300, "armour": "medium", "speed": 5.5, "visionRadius": 11,
        "cost": 2000, "buildTime": 22, "requiredStructure": "helipad",
        "weapons": ["yak_b_12mm", "AT6_spiral_atgm", "s8_rocket_pod"],
        "isHelicopter": True, "hoverHeight": 7,
        "canTransport": True, "transportCapacity": 8,
        "maxAmmo": 24, "rearmTime": 14,
        "veterancyThresholds": [2, 6, 12],
        "tags": ["air", "helicopter", "gunship", "transport", "anti_armor", "advanced"],
        "note": "Flying tank. Only gunship that also carries 8 troops. Dominated Afghanistan. Heavy armour, multiple weapon systems. Hard to kill. Allied pilots call it 'Devil's Chariot'."
    },
]

SUPPORT_UNITS = [
    {
        "id": "harvester_vehicle",
        "displayName": "Ore Collector",
        "category": "vehicle",
        "era": "N/A",
        "hp": 150, "armour": "light", "speed": 2.5, "visionRadius": 4,
        "cost": 0, "buildTime": 8, "requiredStructure": "refinery",
        "weapons": [],
        "tags": ["harvester"],
        "description": "Autonomous ore collector. Cannot attack. Auto-assigned on refinery completion. Replaceable at zero cost."
    },
]

print(f"Allied units:  {len(ALLIED_UNITS)}")
print(f"Soviet units:  {len(SOVIET_UNITS)}")
print(f"Support units: {len(SUPPORT_UNITS)}")
print(f"Total:         {len(ALLIED_UNITS)+len(SOVIET_UNITS)+len(SUPPORT_UNITS)}")

# Print all IDs
print("\nAllied:", [u['id'] for u in ALLIED_UNITS])
print("Soviet:", [u['id'] for u in SOVIET_UNITS])
