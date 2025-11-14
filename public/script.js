const bowls = document.querySelectorAll('.bowl');
const heroes = document.querySelectorAll('.hero');
const wrappers = document.querySelectorAll('.bowl-wrapper');


const targets = Array.from(bowls).map(bowl => bowl.getAttribute('data-target'));
let currentIndex = 0;
let slideInterval;
const slideDuration = 4500;

function setActiveByTarget(target) {
  heroes.forEach(hero => {
    hero.classList.toggle('active', hero.classList.contains(target));
  });

  wrappers.forEach(wrapper => {
    const bowl = wrapper.querySelector('.bowl');
    const bowlTarget = bowl && bowl.getAttribute('data-target');
    wrapper.classList.toggle('active', bowlTarget === target);
  });
}


function autoSlide() {
  currentIndex++;

  if (currentIndex >= targets.length) {
    currentIndex = 0;
  }

  const nextTarget = targets[currentIndex];
  setActiveByTarget(nextTarget);
}

bowls.forEach(bowl => {
  bowl.addEventListener('click', () => {
    clearInterval(slideInterval);
    const target = bowl.getAttribute('data-target');
    currentIndex = targets.indexOf(target);
    setActiveByTarget(target);
    slideInterval = setInterval(autoSlide, slideDuration);
  });
});

document.addEventListener('DOMContentLoaded', () => {
  setActiveByTarget(targets[0]);
  slideInterval = setInterval(autoSlide, slideDuration);
});
