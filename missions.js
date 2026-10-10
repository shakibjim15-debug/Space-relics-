/**
 * NASA MER-A Spirit (Mars Exploration Rover) Verified Educational Archive
 * Provenance Sources: NASA Science, Planetary Data System (PDS), JPL Technical Reports
 */

export const SPIRIT_MISSION_DATA = {
  metadata: {
    roverName: "Spirit (MER-A)",
    launchDate: "June 10, 2003",
    landingDate: "January 4, 2004",
    landingSite: "Gusev Crater (-14.5684° S, 175.4726° E)",
    designLifetimeSols: 90,
    actualOperatingDays: 2210,
    finalCommunication: "March 22, 2010",
    totalDistanceTraversedKm: 7.73,
    missionStatus: "Concluded",
    citations: [
      {
        source: "NASA Science Mission Directory - MER Spirit",
        url: "https://science.nasa.gov/mission/mer-spirit/"
      },
      {
        source: "NASA Planetary Data System (PDS) Geosciences Node",
        url: "https://pds.nasa.gov/"
      },
      {
        source: "NASA JPL Photojournal - MER Spirit Archives",
        url: "https://photojournal.jpl.nasa.gov/"
      }
    ]
  },

  instruments: [
    {
      id: "pancam",
      name: "Panoramic Camera (Pancam)",
      type: "Remote Sensing High-Res Stereo Imaging",
      specs: "1024x1024 pixel CCDs | 11 color filter wheels (400-1100 nm)",
      educationalInsight: "Pancam acted as Spirit's eyes, allowing scientists to calculate rock reflectance spectra and identify iron-bearing minerals from afar.",
      massKg: 0.27,
      powerWatts: 3.0,
      provenanceUrl: "https://pds.nasa.gov/"
    },
    {
      id: "navcam",
      name: "Navigation Camera (Navcam)",
      type: "Monochrome Navigation Stereo Imaging",
      specs: "45-degree field-of-view | Mounted on the Pancam Mast Assembly (PMA)",
      educationalInsight: "Used by rover planners to build 3D mesh maps of the terrain to autonomously avoid hazards and navigate around rocks.",
      massKg: 0.22,
      powerWatts: 2.5,
      provenanceUrl: "https://pds.nasa.gov/"
    },
    {
      id: "mini_tes",
      name: "Miniature Thermal Emission Spectrometer (Mini-TES)",
      type: "Infrared Spectrometer",
      specs: "Spectral range: 5 to 29 micrometers",
      educationalInsight: "Measured thermal emission spectra to determine the mineralogy of rocks and soil without having to drive up and touch them.",
      massKg: 2.4,
      powerWatts: 5.6,
      provenanceUrl: "https://science.nasa.gov/mission/mer-spirit/"
    },
    {
      id: "apxs",
      name: "Alpha Particle X-Ray Spectrometer (APXS)",
      type: "In-Situ Elemental Chemistry Analysis",
      specs: "Curium-244 radioactive source | X-ray detector",
      educationalInsight: "Placed in direct contact with rocks by the robotic arm. Emitted alpha particles to bombard sample atoms, detecting backscattered X-rays to reveal elemental abundance (silicon, iron, sulfur, etc.).",
      massKg: 0.3,
      powerWatts: 1.2,
      provenanceUrl: "https://pds.nasa.gov/"
    },
    {
      id: "mb",
      name: "Mössbauer Spectrometer (MB)",
      type: "Iron Mineralogy Spectrometer",
      specs: "Cobalt-57 gamma-ray source",
      educationalInsight: "Designed specifically to examine iron-containing minerals (like olivine, pyroxene, and hematite) to reveal the environmental conditions and oxidation state when the rocks formed.",
      massKg: 0.5,
      powerWatts: 2.0,
      provenanceUrl: "https://pds.nasa.gov/"
    },
    {
      id: "rat",
      name: "Rock Abrasion Tool (RAT)",
      type: "Physical Surface Grinder",
      specs: "Diamond-tipped cutting wheels | Grinds 45mm diameter x 5mm depth",
      educationalInsight: "Martian rocks have outer crusts weathered by atmospheric radiation and dust. The RAT ground away this outer layer so the spectrometers could sample pristine interior rock.",
      massKg: 0.85,
      powerWatts: 11.0,
      provenanceUrl: "https://science.nasa.gov/mission/mer-spirit/"
    }
  ],

  targets: [
    {
      id: "rock",
      name: "Humphrey Rock (Gusev Crater Floor)",
      type: "Basaltic Volcanic Rock Target",
      sol: 55,
      datasetId: "PDS_MER1_APXS_HUMPHREY_055",
      description: "A dark volcanic rock brushed and ground by Spirit's Rock Abrasion Tool (RAT) on Sol 55.",
      verifiedFindings: "APXS and Mössbauer analyses revealed olivine-rich basaltic composition intersected by thin mineral veins, proving that small quantities of liquid water once percolated through rock fractures in Gusev Crater.",
      powerCostPercent: 25,
      imageUrl: "https://photojournal.jpl.nasa.gov/jpeg/PIA05549.jpg",
      provenanceUrl: "https://photojournal.jpl.nasa.gov/catalog/PIA05549",
      caption: "Microscopic Imager closeup of the interior of Humphrey rock after grinding by the Rock Abrasion Tool."
    },
    {
      id: "hill",
      name: "Columbia Hills Bedrock (Husband Hill)",
      type: "Altered Layered Bedrock Sequence",
      sol: 580,
      datasetId: "PDS_MER1_MINITES_HUSBAND_HILL",
      description: "Steep bedrock outcrops at the summit of Husband Hill showing heavy alteration from aqueous exposure.",
      verifiedFindings: "Mini-TES and APXS detected abundant oxidized iron minerals (hematite, goethite) and sulfates. This proved that ancient water on Mars was not just brief, but extensively altered bedrock in the Columbia Hills.",
      powerCostPercent: 15,
      imageUrl: "https://photojournal.jpl.nasa.gov/jpeg/PIA06803.jpg",
      provenanceUrl: "https://photojournal.jpl.nasa.gov/catalog/PIA06803",
      caption: "Panoramic view looking down into Gusev Crater from the summit of Husband Hill, captured by Spirit's Pancam."
    },
    {
      id: "soil",
      name: "Silica-Rich Soil (Home Plate)",
      type: "Hydrothermal Fumarole Deposit",
      sol: 1150,
      datasetId: "PDS_MER1_APXS_SILICA_1150",
      description: "Exposed accidentally when Spirit's disabled right-front wheel dragged through soil near Home Plate, churning up bright white powder.",
      verifiedFindings: "APXS measured over 90% concentration of pure amorphous silica (SiO2). On Earth, such high silica purity requires hot springs or steam vents (hydrothermal fumaroles), yielding conclusive proof that Mars once harbored habitable hydrothermal environments.",
      powerCostPercent: 30,
      imageUrl: "https://photojournal.jpl.nasa.gov/jpeg/PIA09427.jpg",
      provenanceUrl: "https://photojournal.jpl.nasa.gov/catalog/PIA09427",
      caption: "Bright silica deposits exposed by Spirit's jammed wheel at Home Plate, proving past volcanic hot spring activity."
    }
  ],

  milestones: [
    {
      date: "2003-06-10",
      title: "Launch from Cape Canaveral",
      description: "Spirit launched aboard a Boeing Delta II heavy rocket from SLC-17A, beginning a 487-million-kilometer interplanetary transfer orbit."
    },
    {
      date: "2004-01-04",
      title: "Touchdown at Gusev Crater",
      description: "Entered Mars atmosphere at 5.4 km/s, deployed a supersonic parachute, fired retrorockets, and bounced safely onto soil wrapped in protective airbags."
    },
    {
      date: "2004-03-05",
      title: "Discovery of Water-Altered Minerals",
      description: "Spirit used its RAT tool to grind into rock target 'Humphrey', discovering aqueous mineral veins inside volcanic basalt."
    },
    {
      date: "2005-08-21",
      title: "Husband Hill Summit Achieved",
      description: "Spirit completed a historic 106-meter climb to the top of Husband Hill, surveying ancient weathered rock strata across Gusev Crater."
    },
    {
      date: "2007-05-03",
      title: "Discovery of Past Hydrothermal Environment",
      description: "Spirit's jammed front wheel unearthed 90%+ pure silica soil, proving ancient steam vents or hot springs once existed on Mars."
    },
    {
      date: "2010-03-22",
      title: "Final Mission Downlink",
      description: "After becoming immobilized in soft sand at 'Troy' prior to the Martian winter, Spirit transmitted its final telemetry packet to the Deep Space Network."
    }
  ]
};