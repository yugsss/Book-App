document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const bookForm = document.getElementById('book-form');
    const booksList = document.getElementById('books-list');
    const submitBtn = document.getElementById('submit-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const formTitle = document.getElementById('form-title');
    const bookIdInput = document.getElementById('book-id');
    const imageInput = document.getElementById('image');
    const imagePreview = document.getElementById('image-preview');
    
    let isEditing = false;
    let currentImageFile = null;
    
    // Event listeners
    bookForm.addEventListener('submit', handleFormSubmit);
    cancelBtn.addEventListener('click', resetForm);
    imageInput.addEventListener('change', handleImageUpload);
    
    // Load books when page loads
    loadBooks();
    
    // Handle form submission
    async function handleFormSubmit(e) {
      e.preventDefault();
      
      const title = document.getElementById('title').value;
      const price = document.getElementById('price').value;
      const genre = document.getElementById('genre').value;
      
      if (!title || !price || !genre) {
        alert('Please fill all required fields');
        return;
      }
      
      try {
        if (isEditing) {
          // Update existing book
          const bookId = bookIdInput.value;
          await updateBook(bookId, { title, price, genre });
          
          // Upload new image if selected
          if (currentImageFile) {
            await uploadBookImage(bookId, currentImageFile);
          }
          
          alert('Book updated successfully');
        } else {
          // Add new book
          const newBook = await addBook({ title, price, genre });
          
          // Upload image if selected
          if (currentImageFile) {
            await uploadBookImage(newBook.id, currentImageFile);
          }
          
          alert('Book added successfully');
        }
        
        // Reset form and reload books
        resetForm();
        loadBooks();
      } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Please check console for details.');
      }
    }
    
    // Handle image upload preview
    function handleImageUpload(e) {
      const file = e.target.files[0];
      if (!file) return;
      
      currentImageFile = file;
      
      const reader = new FileReader();
      reader.onload = function(e) {
        imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
      };
      reader.readAsDataURL(file);
    }
    
    // Load all books
    async function loadBooks() {
      try {
        const response = await fetch('/api/books');
        if (!response.ok) throw new Error('Failed to load books');
        
        const books = await response.json();
        renderBooks(books);
      } catch (error) {
        console.error('Error loading books:', error);
        booksList.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error loading books</td></tr>';
      }
    }
    
    // Render books to the table
    function renderBooks(books) {
      if (books.length === 0) {
        booksList.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No books found</td></tr>';
        return;
      }
      
      booksList.innerHTML = books.map(book => `
        <tr data-id="${book.id}">
          <td>
            ${book.imageUrl ? 
              `<img src="${book.imageUrl}" class="book-cover" alt="${book.title}">` : 
              '<div class="book-cover bg-light text-center pt-3"><i class="bi bi-book"></i></div>'}
          </td>
          <td>${book.title}</td>
          <td>${book.genre}</td>
          <td>$${book.price.toFixed(2)}</td>
          <td class="action-buttons">
            <button class="btn btn-sm btn-warning me-2 edit-btn">Edit</button>
            <button class="btn btn-sm btn-danger delete-btn">Delete</button>
          </td>
        </tr>
      `).join('');
      
      // Add event listeners to action buttons
      document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const bookId = btn.closest('tr').dataset.id;
          editBook(bookId);
        });
      });
      
      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const bookId = btn.closest('tr').dataset.id;
          deleteBook(bookId);
        });
      });
    }
    
    // Add a new book
    async function addBook(bookData) {
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookData)
      });
      
      if (!response.ok) throw new Error('Failed to add book');
      return await response.json();
    }
    
    // Update existing book
    async function updateBook(bookId, bookData) {
      const response = await fetch(`/api/books/${bookId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookData)
      });
      
      if (!response.ok) throw new Error('Failed to update book');
      return await response.json();
    }
    
    // Upload book image
    async function uploadBookImage(bookId, imageFile) {
      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onload = async function(e) {
          try {
            const base64String = e.target.result.split(',')[1];
            const response = await fetch('/api/upload', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                imageBase64: base64String,
                bookId: bookId
              })
            });
            
            if (!response.ok) throw new Error('Failed to upload image');
            resolve(await response.json());
          } catch (error) {
            reject(error);
          }
        };
        reader.readAsDataURL(imageFile);
      });
    }
    
    // Delete a book
    async function deleteBook(bookId) {
      if (!confirm('Are you sure you want to delete this book?')) return;
      
      try {
        const response = await fetch(`/api/books/${bookId}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete book');
        
        loadBooks();
      } catch (error) {
        console.error('Error deleting book:', error);
        alert('Failed to delete book');
      }
    }
    
    // Edit book - populate form with existing data
    async function editBook(bookId) {
      try {
        const response = await fetch('/api/books');
        if (!response.ok) throw new Error('Failed to load books');
        
        const books = await response.json();
        const bookToEdit = books.find(book => book.id === bookId);
        
        if (!bookToEdit) throw new Error('Book not found');
        
        // Populate form
        document.getElementById('title').value = bookToEdit.title;
        document.getElementById('price').value = bookToEdit.price;
        document.getElementById('genre').value = bookToEdit.genre;
        bookIdInput.value = bookToEdit.id;
        
        // Clear previous image preview
        imagePreview.innerHTML = '';
        imageInput.value = '';
        currentImageFile = null;
        
        // Show existing image if available
        if (bookToEdit.imageUrl) {
          imagePreview.innerHTML = `<img src="${bookToEdit.imageUrl}" alt="Current Cover">`;
        }
        
        // Change form to edit mode
        isEditing = true;
        submitBtn.textContent = 'Update Book';
        formTitle.textContent = 'Edit Book';
        cancelBtn.style.display = 'inline-block';
        
        // Scroll to form
        document.querySelector('html').scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      } catch (error) {
        console.error('Error editing book:', error);
        alert('Error loading book details');
      }
    }
    
    // Reset form to add mode
    function resetForm() {
      bookForm.reset();
      bookIdInput.value = '';
      isEditing = false;
      currentImageFile = null;
      imagePreview.innerHTML = '';
      submitBtn.textContent = 'Add Book';
      formTitle.textContent = 'Add New Book';
      cancelBtn.style.display = 'none';
    }
  });