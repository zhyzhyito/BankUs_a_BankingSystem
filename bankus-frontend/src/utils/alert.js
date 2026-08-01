import Swal from 'sweetalert2';

/**
 * Modern Success Alert (Auto-closes after 2 seconds)
 */
export const showSuccess = (title, text = '') => {
  return Swal.fire({
    icon: 'success',
    title: title,
    text: text,
    confirmButtonColor: '#10B981',
    timer: 2000,
    timerProgressBar: true,
    showConfirmButton: false,
    background: '#1f2937', // Dark mode friendly (Dark gray)
    color: '#f3f4f6'       // Light text color
  });
};

/**
 * Modern Error Alert
 */
export const showError = (title, text = '') => {
  return Swal.fire({
    icon: 'error',
    title: title,
    text: text,
    confirmButtonColor: '#EF4444',
    background: '#1f2937',
    color: '#f3f4f6'
  });
};

/**
 * Modern Confirmation Dialog (Puwede mong gamitin sa mga Delete o Logout kung kailangan ng confirmation)
 */
export const showConfirm = (title, text, confirmButtonText = 'Yes') => {
  return Swal.fire({
    title: title,
    text: text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#10B981',
    cancelButtonColor: '#EF4444',
    confirmButtonText: confirmButtonText,
    background: '#1f2937',
    color: '#f3f4f6'
  });
};