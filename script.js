

const bowls = document.querySelectorAll('.bowl');
const heroes = document.querySelectorAll('.hero');
const wrappers = document.querySelectorAll('.bowl-wrapper');

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

window.addEventListener('DOMContentLoaded', () => {
  const currentHero = document.querySelector('.hero.active');
  if (currentHero) {
    if (currentHero.classList.contains('hero1')) setActiveByTarget('hero1');
    else if (currentHero.classList.contains('hero2')) setActiveByTarget('hero2');
    else if (currentHero.classList.contains('hero3')) setActiveByTarget('hero3');
  } else {

    setActiveByTarget('hero1');
  }
});


bowls.forEach(bowl => {
  bowl.addEventListener('click', () => {
    const target = bowl.getAttribute('data-target');
    setActiveByTarget(target);
  });
});

