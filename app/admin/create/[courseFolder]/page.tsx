<form className="space-y-4">
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">
      First Name
    </label>
    <input
      type="text"
      name="firstName"
      className="w-full border border-slate-300 rounded-md px-3 py-2"
      required
    />
  </div>

  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">
      Last Name
    </label>
    <input
      type="text"
      name="lastName"
      className="w-full border border-slate-300 rounded-md px-3 py-2"
      required
    />
  </div>

  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">
      Email
    </label>
    <input
      type="email"
      name="email"
      className="w-full border border-slate-300 rounded-md px-3 py-2"
      required
    />
  </div>

  <button
    type="submit"
    className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
  >
    Create Course Code
  </button>
</form>
