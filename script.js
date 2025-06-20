
class Patient {
  constructor(age, gender, height, tbw, crcl, criticallyIll, indicationKey, dialysisKey) {
    this.age = age;
    this.gender = gender;
    this.height = height;
    this.tbw = tbw;
    this.crcl = crcl;
    this.criticallyIll = criticallyIll;
    this.indicationKey = indicationKey;
    this.dialysisKey = dialysisKey;   

    this.indication = getIndications()[indicationKey] || null;
    this.dialysis = getDialysisOptions()[dialysisKey] || null;
    
    // this.mapKeyFromValue(getIndications(), this.indication, 'indicationKey');
    // this.mapKeyFromValue(getDialysisOptions(), this.dialysis, 'dialysisKey');
    
    this.correctCrClForDialysis();
    this.getTargetTrough();
    this.calcIBW();
    this.calcAdjBW();
    this.calcBMI();
    this.getLoadingDoseValue();
    this.getLoadingDose();
    this.getMaintenanceDoseValue();
    this.getMaintenanceDose();
    this.getMaintenanceDoseFreq();
    this.getMaintenanceDoseStart();
    this.getFirstLevel();
    this.populateOutput();
  }
  
  
  mapKeyFromValue(sourceObject, inputValue, targetProperty) {
    for (const [key, value] of Object.entries(sourceObject)) {
      if (value === inputValue) {
        this[targetProperty] = key;
        return key;
      }
    }
    this[targetProperty] = null;
    return null;
  }
  
  correctCrClForDialysis () {
    if (this.dialysisKey !== 'nonHD') {
      this.crcl = 0;
    }
    
    return this.crcl;
  }

    
  getTargetTrough() {
    let targetTrough = '';
      
    if (this.indicationKey === 'cns') {
      this.targetTrough = '15-20';
    } else {
      this.targetTrough = '10-15'
    }
      
    return this.targetTrough;
  }


  calcIBW() {
    const heightInches = this.height / 2.54;
    const inchesOver60 = heightInches - 60;
    const ibwHeight = inchesOver60 > 0 ? inchesOver60 : 0;
    let ibw;

  
    if (this.gender === 'female') {
        ibw = 45.5 + (2.3 * ibwHeight);
    } else {
        ibw = 50 + (2.3 * ibwHeight);
    }

    this.ibw = Math.round(ibw * 100) / 100;
    return this.ibw;
  }
  
  calcAdjBW() {
    const tbw = this.tbw;
    const ibw = this.ibw;
    let dosingWt;

    if (tbw <= ibw) {
        dosingWt = tbw;
    } else {
        const adjBw = ibw + (0.4 * (tbw - ibw));
        dosingWt = adjBw;
    };

    this.dosingWt = Math.round(dosingWt * 100) / 100;
    return this.dosingWt;
  }
  
  calcBMI () {
    const bmi = this.tbw / (this.height/100) ** 2;
    this.bmi = Math.round(bmi * 100) / 100;
    return this.bmi;
  }
  
  getLoadingDose () {
    const loadingDose = this.roundDose(this.loadingDoseValue, this.tbw);
    this.loadingDose = loadingDose;
    
    return this.loadingDose;
  }
    
  getLoadingDoseValue() {
    let loadingDoseValue = 20;
    const noLoadIndicationKeys = ['gyno', 'surgical'];
    const semiNoLoadIndicationKeys = ['boneAndJoint', 'eent', 'urinary', 'intraAbdominal', 'sstiNonNecrotizing'];
  
    if (this.indication === 'cns' && this.crcl >= 35 && this.bmi < 40) {
      loadingDoseValue = 25;
      
    } else if (this.crcl < 35 || this.dialysisKey !== 'nonHD') {
        loadingDoseValue = 20;
      
    } else if (noLoadIndicationKeys.includes(this.indicationKey)) {
      loadingDoseValue = 0;
      
    } else if (semiNoLoadIndicationKeys.includes(this.indicationKey)) {
      if ( this.crcl >= 35 && !this.criticallyIll && this.bmi < 40) {
        loadingDoseValue = 0;
      }
    };
    
    this.loadingDoseValue = loadingDoseValue;
  
    return this.loadingDoseValue;
  }
    
    
  roundDose (doseValue, weight) {
    let dose = weight * doseValue;
    dose = Math.round(dose / 250) * 250;
    dose = Math.min(dose, 2000);
    
    // if (dose === 0) {
    //     dose = 'None';
    // };
  
    return dose;
  }


  getMaintenanceDose() {
    const maintenanceDose = this.roundDose(this.maintenanceDoseValue, this.dosingWt);
    
    this.maintenanceDose = maintenanceDose;
    return this.maintenanceDose;
  }

    
  getMaintenanceDoseValue() {
    let maintenanceDoseValue = 10;
    
    const highDoseIndicationKeys = [
      'cns',
      'bacteremia',
      'boneAndJoint',
      'cardiac',
      'febrileNeutropenia',
      'feverUnknown',
      'pulmonary',
      'sepsis',
      'sstiNecrotizing',
    ]
    
    const noDoseDialysisKeys = [
      'irregHD',
      'sled',
      'dsd', 
      'pirrt',
      'capd',
      'apd',
      'pd', //Just in case
      'crrtNotTolerated',
      ]
    
    if (this.dialysisKey === 'nonHD' && this.crcl < 35) {
      maintenanceDoseValue = 0;
    } else if (noDoseDialysisKeys.includes(this.dialysisKey)) {
      maintenanceDoseValue = 0;
    } else if (this.dialysisKey === 'crrtTolerated') {
      maintenanceDoseValue = 15;
    } else if (highDoseIndicationKeys.includes(this.indicationKey) && this.age < 65) {
      maintenanceDoseValue = 15;
    };
    
    // console.log('Maintenance Dose Value: ', maintenanceDoseValue);
    this.maintenanceDoseValue = maintenanceDoseValue;
    
    return this.maintenanceDoseValue;
  }
  
  getMaintenanceDoseFreq() {
    let freq = null;
    const noFreqDialysisKeys = ['irregHD', 'sled', 'dsd', 'pirrt', 'capd', 'apd', 'pd', 'crrtNotTolerated'];
    
    if (this.maintenanceDose === 0) {
      freq = null;
    } else if (this.dialysisKey === 'regHD') {
      freq = {postHD : 'after each HD session'};
    } else if (this.dialysisKey === 'crrtTolerated') {
      freq = {24 : 'every 24 hours'};
    } else if (this.crcl >= 35 && this.crcl < 65) {
      freq = {24: 'every 24 hours'};
    } else if (this.crcl >= 65) {
      freq = {12: 'every 12 hours'};
    };
    
    this.maintenanceFreq = freq;
    return this.maintenanceFreq;
  }
  
  
  getMaintenanceDoseStart () {
    let maintenanceDoseStart = null;

    if (this.crcl > 35 && this.tbw >= 125) {
      const freqKey = Number(Object.keys(this.maintenanceFreq)[0]); // Get the key as a number
      maintenanceDoseStart = Math.round(freqKey * 0.67);
    }

    this.maintenanceDoseStart = maintenanceDoseStart;
    return this.maintenanceDoseStart;
  }

  getFirstLevel () {
    let firstLevel = null;
    
    if (this.crcl >= 35) {
      firstLevel = 'Trough level 30 minutes prior to the 4th or 5th dose';
    } else if (this.dialysisKey === 'nonHD' && this.crcl < 35) {
      firstLevel = 'Random level 24-36 hours after loading dose';
    } else if (this.dialysisKey === 'regHD') {
      firstLevel = 'Pre-dialysis random level prior to the 2nd or 3rd maintenance dose';
    } else if (this.dialysisKey === 'irregHD') {
      firstLevel = 'Pre-dialysis random level prior to the next dialysis session';
    } else if (this.dialysisKey === 'sled' || this.dialysisKey === 'dsd' || this.dialysisKey === 'pirrt') {
      firstLevel = `Pre or post dialysis random level if next dialysis session is within 48 hours.  
                  Post-dialysis level is preferred, and is checked 4-6 hours after dialysis. 
                  If no sessions are scheduled within 48 hours, consider random level at 48 hours`;
    } else if (this.dialysisKey === 'capd' || this.dialysisKey === 'apd') {
      firstLevel = 'Random level 48-72 hours after loading dose';
    } else if (this.dialysisKey === 'crrtTolerated') {
        firstLevel = 'Trough Level 30 minutes prior to 3rd or 4th dose';
    } else if (this.dialysisKey === 'crrtNotTolerated') {
        firstLevel = 'Random level 12-24 hours after loading dose';
    }
    
    this.firstLevel = firstLevel
    return this.firstLevel ;
  }

  populateOutput () {
    let loadingDoseText = '';
    let maintenanceDoseText = '';
    let firstLevelText = '';

    const freqEntry = Object.entries(this.maintenanceFreq || {})[0];  // get the first key-value pair
    const freqText = freqEntry ? freqEntry[1] : '';  // use the value (like "every 24 hours")

    if (this.loadingDose !== 0) {
      loadingDoseText = `${this.loadingDose} mg`;
    } else {
      loadingDoseText = 'No Loading Dose';
    }

    // if (this.maintenanceDose !== 0) {
    //   if (this.maintenanceDoseStart !== null) {
    //     maintenanceDoseText = `${this.maintenanceDose} mg ${freqText}, initiated ${this.maintenanceDoseStart} hrs after loading dose`;
    //   } else {
    //     maintenanceDoseText = `${this.maintenanceDose} mg ${freqText}`;
    //   }
    // } else {
    //   maintenanceDoseText = 'Guided by Levels'
    // }
    
    if (this.maintenanceDose !== 0) {
      if (this.maintenanceDoseStart !== null && this.loadingDose !== 0) {
        maintenanceDoseText = `${this.maintenanceDose} mg ${freqText}, initiated ${this.maintenanceDoseStart} hours after loading dose`;
      } else if (this.maintenanceDoseStart !== null && this.loadingDose == 0) {
        maintenanceDoseText = `${this.maintenanceDose} mg ${freqText}, with first two doses separated by ${this.maintenanceDoseStart} hours`;
      } else {
        maintenanceDoseText = `${this.maintenanceDose} mg ${freqText}`;
      }
    } else {
      maintenanceDoseText = 'Guided by Levels';
    }

    if (this.firstLevel !== null) {
      firstLevelText = this.firstLevel;
    }

    this.loadingDoseText = loadingDoseText;
    this.maintenanceDoseText = maintenanceDoseText;
    this.firstLevelText = firstLevelText;

    return {
      loadingDoseText: this.loadingDoseText,
      maintenanceDoseText: this.maintenanceDoseText,
      firstLevelText: this.firstLevelText
    };
  }

}



function getIndications() {
  return {
    cns: 'CNS Infection/Meningitis',
    bacteremia: 'Blood Stream Infection',
    boneAndJoint: 'Bone and Joint Infection',
    cardiac: 'Cardiac Infection / Endocarditis',
    eent: 'EENT Infection',
    febrileNeutropenia: 'Febrile Neutropenia',
    feverUnknown: 'Fever of Unknown Origin',
    urinary: 'Genitourinary Infection',
    gyno: 'Gynecological Infection',
    intraAbdominal: 'Intra-Abdominal Infection',
    pulmonary: 'Pulmonary Infection',
    sepsis: 'Sepsis',
    sstiNonNecrotizing: 'SSTI (Non-Necrotizing)',
    sstiNecrotizing: 'SSTI (Necrotizing)',
    surgical: 'Surgical Prophylaxis',
  };
}

function getDialysisOptions() {
  return {
    nonHD: 'Non-Dialysis',
    regHD: 'Hemodialysis - Regular Schedule',
    irregHD: 'Hemodialysis - Irregular Schedule',
    sled : 'Sustained Low Efficiency Dialysis (SLED)',
    dsd: ' Daily Slow Dialysis (DSD)',
    pirrt: 'Prolonged Intermittent Renal Replacement Therapy (PIRRT)',
    capd: 'Continuous Ambulatory Peritoneal Dialysis (CAPD)',
    apd: 'Automated Peritoneal Dialysis (APD)',
    // pd: 'Peritoneal Dialysis',
    crrtTolerated: 'Continuous Renal Replacement Therapy (CRRT) - Tolerated',
    crrtNotTolerated: 'Continuous Renal Replacement Therapy (CRRT) - Not Tolerated',
  }
}

const App = {
  initialize() {
    this.populateDropdown("indication", getIndications(), "-- Select Indication --");
    this.populateDropdown("dialysis", getDialysisOptions(), "-- Select Dialysis Type --");
    this.attachEventListeners();
  },

  populateDropdown(selectId, optionsObj, placeholderText) {
    const select = document.getElementById(selectId);
    select.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.textContent = placeholderText;
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.value = "";
    select.appendChild(placeholder);

    Object.entries(optionsObj).forEach(([key, value]) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = value;
      select.appendChild(option);
    });
  },

  attachEventListeners() {
    document.querySelector(".patient-form").addEventListener("submit", this.handleFormSubmit);
    document.getElementById("clear-btn").addEventListener("click", this.handleClear);
    // const form = document.querySelector(".patient-form")
    // form.addEventListener("submit", this.handleFormSubmit);
    // form.addEventListener("clear", this.handleClear);

    document.querySelectorAll('.info-icon').forEach(icon => {
      const popup = icon.querySelector('.info-popup');

      icon.addEventListener('click', (e) => {
        e.stopPropagation();
        const currentlyVisible = popup.classList.contains('visible');

        // Close all others
        document.querySelectorAll('.info-popup').forEach(p => p.classList.remove('visible'));

        if (!currentlyVisible) {
          popup.classList.add('visible');
        }
      });
    });

    document.addEventListener('click', () => {
      document.querySelectorAll('.info-popup').forEach(popup => {
        popup.classList.remove('visible');
      });
    });
  },
  
  handleFormSubmit(event) {
    event.preventDefault();
    
    const age = parseInt(document.getElementById("age").value, 10);
    const gender = document.querySelector('input[name="gender"]:checked').value;
    const height = parseFloat(document.getElementById("height").value);
    const tbw = parseFloat(document.getElementById("tbw").value);
    const crcl = parseFloat(document.getElementById("crcl").value);
    const criticallyIllValue = document.querySelector('input[name="critically-ill"]:checked').value;
    const criticallyIll = criticallyIllValue === "yes";
    const indication = document.getElementById("indication").value;
    const dialysis = document.getElementById("dialysis").value;
    
    const patient = new Patient(age, gender, height, tbw, crcl, criticallyIll, indication, dialysis);
    console.log("Patient created:", patient);
    
    document.getElementById('loading-dose-label').textContent = 'Loading Dose:';
    document.getElementById('maintenance-dose-label').textContent = 'Maintenance Dose:';
    document.getElementById('initial-labs-label').textContent = 'Initial Labs:';
    
    document.getElementById('loading-dose').textContent = patient.loadingDoseText;
    document.getElementById('maintenance-dose').textContent = patient.maintenanceDoseText;
    document.getElementById('initial-labs').textContent = patient.firstLevelText;
    
    document.getElementById('ibw-label').textContent = 'Ideal Body Weight:';
    document.getElementById('adj-bw-label').textContent = 'Adjusted Body Weight:';
    document.getElementById('bmi-label').textContent = 'Body Mass Index:';
    document.getElementById('ld-weight-label').textContent = 'Loading Dose Weight Used:';
    document.getElementById('md-weight-label').textContent = 'Maintenance Dose Weight Used:';
    document.getElementById('ld-value-label').textContent = 'Loading Dose:';
    document.getElementById('md-value-label').textContent = 'Maintenance Dose:';
    document.getElementById('target-trough-label').textContent = 'Target Trough:';
    
    document.getElementById('ibw').textContent = patient.ibw + ' kg';
    document.getElementById('adj-bw').textContent = patient.dosingWt + ' kg';
    document.getElementById('bmi').textContent = patient.bmi + ' kg/m2';
    document.getElementById('ld-weight').textContent = patient.tbw + ' kg';
    document.getElementById('md-weight').textContent = patient.dosingWt + ' kg';
    document.getElementById('ld-value').textContent = patient.loadingDoseValue + ' mg/kg';
    document.getElementById('md-value').textContent = patient.maintenanceDoseValue + ' mg/kg';
    document.getElementById('target-trough-value').textContent = patient.targetTrough + ' mcg/ml';
    document.getElementById('output-container').style.display = 'block';
    
    },
    
    handleClear(event) {
        event.preventDefault();
        document.querySelector(".patient-form").reset();
        
        document.getElementById('loading-dose-label').textContent = '';
        document.getElementById('maintenance-dose-label').textContent = '';
        document.getElementById('initial-labs-label').textContent = '';
        
        document.getElementById('ibw-label').textContent = '';
        document.getElementById('adj-bw-label').textContent = '';
        document.getElementById('bmi-label').textContent = '';
        document.getElementById('ld-weight-label').textContent = '';
        document.getElementById('md-weight-label').textContent = '';
        document.getElementById('ld-value-label').textContent = '';
        document.getElementById('md-value-label').textContent = '';
        document.getElementById('target-trough-label').textContent = '';
            
        
        document.getElementById('loading-dose').textContent = '';
        document.getElementById('maintenance-dose').textContent = '';
        document.getElementById('initial-labs').textContent ='';
        document.getElementById("indication").value = '';
        document.getElementById("dialysis").value = '';
        
        document.getElementById('ibw').textContent = '';
        document.getElementById('adj-bw').textContent = '';
        document.getElementById('bmi').textContent = '';
        document.getElementById('ld-weight').textContent = '';
        document.getElementById('md-weight').textContent = '';
        document.getElementById('ld-value').textContent = '';
        document.getElementById('md-value').textContent = '';
        document.getElementById('target-trough-value').textContent = '';
    
    },

//   handleFormSubmit(event) {
//         event.preventDefault();

//     const age = parseInt(document.getElementById("age").value, 10);
//     const gender = document.getElementById("gender").value;
//     const height = parseFloat(document.getElementById("height").value);
//     const tbw = parseFloat(document.getElementById("tbw").value);
//     const crcl = parseFloat(document.getElementById("crcl").value);
//     const criticallyIllValue = document.querySelector('input[name="criticallyIll"]:checked').value;
//     const criticallyIll = criticallyIllValue === "true";
//     const indication = document.getElementById("indication").value;
//     const dialysis = document.getElementById("dialysis").value;

//     const patient = new Patient(age, gender, height, tbw, crcl, criticallyIll, indication, dialysis);
//     console.log("Patient created:", patient);

//     document.getElementById('loading-dose').textContent = patient.loadingDoseText;
//     document.getElementById('maintenance-dose').textContent = patient.maintenanceDoseText;
//     document.getElementById('first-level').textContent = patient.firstLevelText;
//     document.getElementById('output-container').style.display = 'block';


//   },
  
};

document.addEventListener("DOMContentLoaded", () => App.initialize());


// const patient = new Patient(
//   age=62, 
//   gender='male', 
//   height=188, 
//   tbw=95.2, 
//   crcl=60, 
//   criticallyIll=false, 
//   indication='Blood Stream Infection',
//   // indication='Surgical Prophylaxis',
//   dialysis = 'Non-Dialysis',
// );

// console.log(patient);



