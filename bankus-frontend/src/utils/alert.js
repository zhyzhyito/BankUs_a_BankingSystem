import Swal from 'sweetalert2';

export const showSuccess = (title, text = '') => {
  return Swal.fire({
    icon: 'success',
    title: title,
    text: text,
    confirmButtonColor: '#10B981',
    timer: 2000,
    timerProgressBar: true,
    showConfirmButton: false,
    background: '#1f2937',
    color: '#f3f4f6'
  });
};

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