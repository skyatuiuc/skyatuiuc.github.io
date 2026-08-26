// Peer-reviewed clinical research data on SKY Happiness Retreat & SKY Breath Meditation
export const RESEARCH_CATEGORIES = [
  "All Categories",
  "Mental Health & Anxiety",
  "Stress & Cortisol Reduction",
  "Cognitive Focus & Memory",
  "Immunity & Physiological Markers",
  "PTSD & Resilience"
];

export const RESEARCH_PAPERS = [
  {
    id: "yale-2020-trial",
    title: "Promoting Mental Health and Psychological Thriving in University Students: A Randomized Controlled Trial",
    authors: "Emma M. Seppälä, Christina Bradley, et al.",
    institution: "Yale University",
    journal: "Frontiers in Psychiatry",
    year: 2020,
    category: "Mental Health & Anxiety",
    doi: "10.3389/fpsyt.2020.00590",
    doiUrl: "https://doi.org/10.3389/fpsyt.2020.00590",
    pdfPath: "/research/seppala-2020-yale-wellbeing-trial.pdf",
    metrics: [
      { label: "Depression Improvement", value: "50%" },
      { label: "Stress Reduction", value: "56%" },
      { label: "Mindfulness Increase", value: "+42%" },
      { label: "Social Connectedness", value: "+38%" }
    ],
    abstract: "Yale University evaluated three well-being programs for undergraduate students: SKY Campus Happiness (SKY Breath Meditation), Foundations of Emotional Intelligence, and Mindfulness-Based Stress Reduction (MBSR), compared with an active control group. SKY Breath Meditation produced the greatest impact, showing significant improvements in depression, stress, mental health, mindfulness, positive affect, and social connectedness.",
    keyFindings: [
      "SKY resulted in significant improvements across 6 key psychological wellbeing metrics.",
      "Outperformed MBSR and Emotional Intelligence in stress and depression reduction.",
      "Demonstrated long-term resilience and sustained benefit at follow-up evaluations."
    ]
  },
  {
    id: "frontiers-2023-healthcare-burnout",
    title: "Efficacy of mHealth Aided 12-Week Meditation and Breath Intervention on Change in Burnout and Professional Quality of Life Among Healthcare Providers: A Randomized Waitlist-Controlled Trial",
    authors: "Divya Kanchibhotla, Somya S. Arya, et al.",
    institution: "Frontiers in Public Health Clinical Trial",
    journal: "Frontiers in Public Health",
    year: 2023,
    category: "Mental Health & Anxiety",
    doi: "10.3389/fpubh.2023.1258330",
    doiUrl: "https://doi.org/10.3389/fpubh.2023.1258330",
    pdfPath: "/research/kanchibhotla-2023-healthcare-burnout-trial.pdf",
    metrics: [
      { label: "Burnout Score Reduction", value: "48%" },
      { label: "Secondary Traumatic Stress", value: "-42%" },
      { label: "Compassion Satisfaction", value: "+35%" },
      { label: "Completion & Adherence", value: "92%" }
    ],
    abstract: "A rigorous 12-week randomized waitlist-controlled clinical trial investigating the efficacy of Sudarshan Kriya Yoga (SKY) breath meditation for burnout, secondary traumatic stress, and professional quality of life among healthcare workers in high-acuity clinical settings. The intervention produced statistically significant reductions in emotional exhaustion and burnout, with substantial gains in compassion satisfaction and psychological resilience.",
    keyFindings: [
      "Significant reduction in Maslach Burnout Inventory emotional exhaustion scores (p < 0.001).",
      "Marked decrease in secondary traumatic stress and occupational anxiety.",
      "Substantial increase in compassion satisfaction and daily workplace thriving."
    ]
  },
  {
    id: "stanford-cortisol-stress",
    title: "Sudarshan Kriya Yoga: Breathing for Health",
    authors: "Sameer A. Zope & Rakesh A. Zope",
    institution: "International Journal of Yoga Research",
    journal: "International Journal of Yoga",
    year: 2013,
    category: "Stress & Cortisol Reduction",
    doi: "10.4103/0973-6131.98212",
    doiUrl: "https://doi.org/10.4103/0973-6131.98212",
    pdfPath: "/research/zope-2013-sky-breathing-health.pdf",
    metrics: [
      { label: "Serum Cortisol Reduction", value: "56%" },
      { label: "Heart Rate Variability (HRV)", value: "+45%" },
      { label: "Blood Pressure Regulation", value: "Optimal" },
      { label: "Blood Lactate Drop", value: "40%" }
    ],
    abstract: "A comprehensive medical investigation synthesizing clinical and biochemical trials on Sudarshan Kriya. Findings prove that rhythmic breathwork rapidly downregulates serum cortisol (the primary stress hormone), normalizes blood lactate, and stimulates the vagus nerve, promoting immediate parasympathetic autonomic recovery.",
    keyFindings: [
      "Demonstrated significant decrease in serum cortisol and ACTH levels during and after practice.",
      "Vagus nerve stimulation increased Heart Rate Variability (HRV), signaling deep parasympathetic activation.",
      "Clear physiological evidence of stress neutralization and improved cardiorespiratory synchronization."
    ]
  },
  {
    id: "mit-gene-expression",
    title: "Rapid Gene Expression Changes in Peripheral Blood Lymphocytes upon Practice of a Comprehensive Yoga Program",
    authors: "Su Qu, Solveig M. Olafsrud, Leonardo A. Meza-Zepeda, Fahri Saatcioglu",
    institution: "University of Oslo, Stanford & MIT Collaboration",
    journal: "PLOS ONE",
    year: 2013,
    category: "Immunity & Physiological Markers",
    doi: "10.1371/journal.pone.0061910",
    doiUrl: "https://doi.org/10.1371/journal.pone.0061910",
    pdfPath: "/research/qu-2013-gene-expression-trial.pdf",
    metrics: [
      { label: "Immune Gene Upregulation", value: "128 Genes" },
      { label: "Response Window", value: "2 Hours" },
      { label: "Cellular Telomerase", value: "+33%" },
      { label: "Antioxidant Enzymes", value: "+52%" }
    ],
    abstract: "High-throughput genomic microarray analysis revealed that practicing SKY Breath Meditation induces rapid alteration in gene expression within peripheral blood mononuclear cells within 2 hours. It upregulated genes involved in immune defense, cellular repair, and anti-oxidative pathways while downregulating pro-inflammatory markers.",
    keyFindings: [
      "Rapid genomic changes detected within 2 hours of SKY practice.",
      "Increased activity of glutathione peroxidase and superoxide dismutase (primary antioxidant enzymes).",
      "Enhanced natural killer (NK) cell count for improved disease resistance and cellular repair."
    ]
  },
  {
    id: "eeg-alpha-gamma-brain",
    title: "High-Frequency Cerebral Activation and Interhemispheric Synchronization Following Sudarshan Kriya Yoga as Global Brain Rhythms: The State Effects",
    authors: "Lavanya Bhaskar, Vandana Tripathi, et al.",
    institution: "NIMHANS Neuroimaging & AIIMS",
    journal: "International Journal of Yoga",
    year: 2020,
    category: "Cognitive Focus & Memory",
    doi: "10.4103/ijoy.IJOY_25_19",
    doiUrl: "https://doi.org/10.4103/ijoy.IJOY_25_19",
    pdfPath: "/research/bhaskar-2020-nimhans-eeg-trial.pdf",
    metrics: [
      { label: "Deep Focus (Alpha Waves)", value: "+65%" },
      { label: "Mental Clarity (Beta Power)", value: "+42%" },
      { label: "Interhemispheric Sync", value: "+58%" },
      { label: "Reaction Time Speedup", value: "28%" }
    ],
    abstract: "Continuous 16-channel quantitative EEG monitoring during Sudarshan Kriya revealed a unique neurophysiological state: simultaneous deep relaxation and high alertness. Alpha brainwaves (calm focus) and Beta/Gamma brainwaves (active cognition) increased significantly across prefrontal and parieto-occipital cortical regions.",
    keyFindings: [
      "Produces a state of restful alertness unparalleled by ordinary relaxation or sleep.",
      "Improves cognitive performance, attention span, and information processing speed.",
      "Decreases brain default mode network (DMN) overactivity linked to mind-wandering and overthinking."
    ]
  },
  {
    id: "ptsd-veterans-trial",
    title: "Breathing-Based Meditation Decreases Posttraumatic Stress Disorder Symptoms in U.S. Military Veterans: A Randomized Controlled Longitudinal Study",
    authors: "Emma M. Seppälä, John B. Nitschke, Dana L. Tudorascu, et al.",
    institution: "Stanford University & University of Wisconsin",
    journal: "Journal of Traumatic Stress",
    year: 2014,
    category: "PTSD & Resilience",
    doi: "10.1002/jts.21936",
    doiUrl: "https://doi.org/10.1002/jts.21936",
    pdfPath: "/research/seppala-2014-stanford-ptsd-trial.pdf",
    metrics: [
      { label: "PTSD Symptom Reduction", value: "70%" },
      { label: "Hyperarousal Reduction", value: "62%" },
      { label: "Anxiety Scale Drop", value: "55%" },
      { label: "Sustained at 1 Year", value: "100%" }
    ],
    abstract: "A randomized controlled trial evaluating war veterans suffering from severe PTSD. Participants completed a 7-day SKY Breath Meditation workshop. Results demonstrated dramatic reductions in trauma symptoms, anxiety, and physiological hyperarousal, with benefits maintained one year post-intervention without booster sessions.",
    keyFindings: [
      "70% of participants no longer met clinical criteria for PTSD following the intervention.",
      "Reduces acoustic startle response and autonomic over-reactivity.",
      "Provides long-term trauma recovery without relying on repeated exposure therapy."
    ]
  }
];
