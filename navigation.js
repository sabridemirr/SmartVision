export function setupNavigation() {
  document.querySelector('#navigation-form').addEventListener('submit', event => {
    event.preventDefault(); const destination = document.querySelector('#destination').value.trim();
    if (destination) window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=walking`, '_blank', 'noopener,noreferrer');
  });
}
