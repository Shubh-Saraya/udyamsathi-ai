// Sends the values needed for a personalised analysis.
(()=>{
  const originalProfile=window.profile;
  window.profile=function(){
    return {...originalProfile(),capital:document.getElementById('capital').value,business:document.getElementById('business').value,experience:document.getElementById('experience').value};
  };
  const originalRender=window.render;
  window.render=function(){
    originalRender();
    const note=document.querySelector('.key-metrics .metric small');
    if(note)note.textContent='Presentation demo estimate — validate locally';
  };
})();
