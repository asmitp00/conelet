const bowls = document.querySelectorAll('.bowl');
const heroes = document.querySelectorAll('.hero');

bowls.forEach(bowl => {
  bowl.addEventListener('click', () => {
    const target = bowl.getAttribute('data-target');

    heroes.forEach(hero => {
      hero.classList.remove('active');
      if (hero.classList.contains(target)) {
        hero.classList.add('active');
      }
    });
  });
});
